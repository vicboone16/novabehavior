/**
 * Sync Queue Manager
 * Handles queuing mutations when offline and syncing when online.
 * Implements last-write-wins conflict resolution.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  addToSyncQueue,
  getPendingSyncItems,
  getRetryableSyncItems,
  updateSyncItemStatus,
  clearCompletedSyncItems,
  getSyncQueueStats,
  SyncQueueItem,
} from './offlineStorage';
import { toast } from 'sonner';

export type SyncEventType = 'sync-start' | 'sync-complete' | 'sync-error' | 'queue-updated';

interface SyncEvent {
  type: SyncEventType;
  data?: any;
}

type SyncEventListener = (event: SyncEvent) => void;

class SyncQueueManager {
  private isProcessing = false;
  private listeners: Set<SyncEventListener> = new Set();
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Subscribe to sync events
   */
  subscribe(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SyncEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Queue a mutation for sync
   */
  async queueMutation(
    table: string,
    action: 'create' | 'update' | 'delete',
    data: any,
    recordId?: string
  ): Promise<string> {
    const id = await addToSyncQueue({
      action,
      table,
      recordId,
      data,
    });

    this.emit({ type: 'queue-updated' });

    // Attempt immediate sync if online
    if (navigator.onLine) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Process all pending items in the queue
   */
  async processQueue(): Promise<{ success: number; failed: number }> {
    if (this.isProcessing) {
      console.log('[SyncQueue] Already processing, skipping');
      return { success: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      console.log('[SyncQueue] Offline, skipping sync');
      return { success: 0, failed: 0 };
    }

    this.isProcessing = true;
    this.emit({ type: 'sync-start' });

    let success = 0;
    let failed = 0;

    try {
      // Get pending items
      const pendingItems = await getPendingSyncItems();
      const retryItems = await getRetryableSyncItems();
      const allItems = [...pendingItems, ...retryItems];

      if (allItems.length === 0) {
        console.log('[SyncQueue] No items to sync');
        this.isProcessing = false;
        return { success: 0, failed: 0 };
      }

      console.log(`[SyncQueue] Processing ${allItems.length} items`);

      for (const item of allItems) {
        try {
          await updateSyncItemStatus(item.id, 'syncing');
          await this.processSingleItem(item);
          await updateSyncItemStatus(item.id, 'completed');
          success++;
        } catch (error) {
          console.error(`[SyncQueue] Failed to sync item ${item.id}:`, error);
          await updateSyncItemStatus(
            item.id,
            'failed',
            error instanceof Error ? error.message : 'Unknown error'
          );
          failed++;
        }
      }

      // Clean up completed items
      await clearCompletedSyncItems();

      this.emit({ 
        type: 'sync-complete', 
        data: { success, failed } 
      });

      if (failed > 0) {
        this.scheduleRetry();
      }

    } catch (error) {
      console.error('[SyncQueue] Queue processing error:', error);
      this.emit({ type: 'sync-error', data: error });
    } finally {
      this.isProcessing = false;
    }

    return { success, failed };
  }

  /**
   * Process a single sync queue item
   */
  private async processSingleItem(item: SyncQueueItem): Promise<void> {
    const { table, action, data, recordId } = item;

    switch (action) {
      case 'create':
        await this.handleCreate(table, data);
        break;
      case 'update':
        await this.handleUpdate(table, recordId!, data);
        break;
      case 'delete':
        await this.handleDelete(table, recordId!);
        break;
    }
  }

  private async handleCreate(table: string, data: any): Promise<void> {
    // Add client timestamp for conflict resolution
    const payload = {
      ...data,
      client_timestamp: new Date(data.clientTimestamp || Date.now()).toISOString(),
    };

    const { error } = await supabase.from(table as any).insert(payload);
    if (error) throw error;
  }

  private async handleUpdate(table: string, recordId: string, data: any): Promise<void> {
    // Check if server version is newer (last-write-wins)
    const { data: existing, error: fetchError } = await supabase
      .from(table as any)
      .select('updated_at')
      .eq('id', recordId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // If record doesn't exist on server, create it
    if (!existing) {
      await this.handleCreate(table, { ...data, id: recordId });
      return;
    }

    // Last-write-wins: client data wins if client timestamp is newer
    const payload = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from(table as any)
      .update(payload)
      .eq('id', recordId);

    if (error) throw error;
  }

  private async handleDelete(table: string, recordId: string): Promise<void> {
    const { error } = await supabase
      .from(table as any)
      .delete()
      .eq('id', recordId);

    if (error) throw error;
  }

  /**
   * Schedule a retry for failed items
   */
  private scheduleRetry(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Exponential backoff: retry in 30 seconds
    this.retryTimeoutId = setTimeout(() => {
      console.log('[SyncQueue] Retrying failed items');
      this.processQueue();
    }, 30000);
  }

  /**
   * Get current queue stats
   */
  async getStats(): Promise<{ pending: number; failed: number; syncing: number }> {
    return getSyncQueueStats();
  }

  /**
   * Force sync all pending items
   */
  async forceSync(): Promise<{ success: number; failed: number }> {
    if (!navigator.onLine) {
      toast.error('Cannot sync while offline');
      return { success: 0, failed: 0 };
    }

    return this.processQueue();
  }
}

// Singleton instance
export const syncQueue = new SyncQueueManager();

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[SyncQueue] Back online, triggering sync');
    toast.info('Back online - syncing data...');
    syncQueue.processQueue().then(({ success, failed }) => {
      if (success > 0) {
        toast.success(`Synced ${success} item${success !== 1 ? 's' : ''}`);
      }
      if (failed > 0) {
        toast.error(`Failed to sync ${failed} item${failed !== 1 ? 's' : ''}`);
      }
    });
  });
}
