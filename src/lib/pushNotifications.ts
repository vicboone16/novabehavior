import { supabase } from '@/integrations/supabase/client';

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Get current notification permission status
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  
  const permission = await Notification.requestPermission();
  return permission;
}

// Subscribe to push notifications
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return null;
  }

  try {
    // Register service worker if not already registered
    const registration = await navigator.serviceWorker.register('/sw-push.js');
    await navigator.serviceWorker.ready;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey,
    });

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return null;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error);
    return false;
  }
}

// Get current push subscription
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

// Save subscription to database
export async function saveSubscriptionToDatabase(
  subscription: PushSubscription,
  deviceName?: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const subscriptionJson = JSON.parse(JSON.stringify(subscription.toJSON()));

    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: user.id,
        subscription: subscriptionJson,
        device_name: deviceName || getBrowserName(),
        is_active: true,
      });

    if (error && error.code === '23505') {
      // Unique constraint violation - subscription exists, update it
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      return !updateError;
    }

    return !error;
  } catch (error) {
    console.error('Failed to save subscription:', error);
    return false;
  }
}

// Remove subscription from database
export async function removeSubscriptionFromDatabase(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Delete all subscriptions for this user on this device
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);

    return !error;
  } catch (error) {
    console.error('Failed to remove subscription:', error);
    return false;
  }
}

// Update push preferences
export async function updatePushPreferences(
  preferences: Record<string, boolean>
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('profiles')
      .update({
        push_preferences: preferences,
      })
      .eq('user_id', user.id);

    return !error;
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return false;
  }
}

// Toggle push notifications on/off
export async function togglePushEnabled(enabled: boolean): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('profiles')
      .update({ push_enabled: enabled })
      .eq('user_id', user.id);

    return !error;
  } catch (error) {
    console.error('Failed to toggle push:', error);
    return false;
  }
}

// Helper: Get browser name for device identification
function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Browser';
}

// Show a local notification (for testing or fallback)
export function showLocalNotification(title: string, options?: NotificationOptions): void {
  if (Notification.permission === 'granted') {
    new Notification(title, options);
  }
}
