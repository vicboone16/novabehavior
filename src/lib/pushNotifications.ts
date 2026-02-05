import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Convert base64 to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushNotificationStatus {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  vapidConfigured: boolean;
}

export async function checkPushSupport(): Promise<PushNotificationStatus> {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const vapidConfigured = !!VAPID_PUBLIC_KEY;
  
  if (!supported) {
    return { 
      supported: false, 
      permission: 'unsupported', 
      subscribed: false,
      vapidConfigured 
    };
  }

  const permission = Notification.permission;
  let subscribed = false;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      subscribed = !!subscription;
    }
  } catch (error) {
    console.error('Error checking push subscription:', error);
  }

  return { supported, permission, subscribed, vapidConfigured };
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw-push.js', {
      scope: '/'
    });
    console.log('Push service worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY) {
    console.error('VAPID public key not configured');
    return null;
  }

  try {
    let registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
    
    if (!registration) {
      registration = await registerServiceWorker();
    }

    if (!registration) {
      throw new Error('Failed to register service worker');
    }

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });
    }

    // Save subscription to database
    const subscriptionJson = subscription.toJSON();
    
    const { error } = await supabase
      .from('push_subscriptions')
      .insert([{
        user_id: userId,
        subscription: JSON.parse(JSON.stringify(subscriptionJson)),
        device_name: getDeviceName(),
        user_agent: navigator.userAgent,
        is_active: true
      }]);

    if (error) {
      // If duplicate, update instead
      if (error.message.includes('duplicate')) {
        await supabase
          .from('push_subscriptions')
          .update({ 
            is_active: true,
            updated_at: new Date().toISOString() 
          })
          .eq('user_id', userId);
      } else {
        console.error('Error saving push subscription:', error);
      }
    }

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return null;
  }
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
    
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }
    }

    // Remove subscription from database
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    return true;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return false;
  }
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  if (/iPhone|iPad|iPod/.test(ua)) {
    return 'iOS Device';
  } else if (/Android/.test(ua)) {
    return 'Android Device';
  } else if (/Windows/.test(ua)) {
    return 'Windows PC';
  } else if (/Mac/.test(ua)) {
    return 'Mac';
  } else if (/Linux/.test(ua)) {
    return 'Linux PC';
  }
  
  return 'Unknown Device';
}

export async function sendTestNotification(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        test: true
      }
    });

    if (error) {
      console.error('Error sending test notification:', error);
      return false;
    }

    return data?.success || false;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
}
