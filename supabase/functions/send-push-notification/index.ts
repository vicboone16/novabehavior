import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  message?: string;
  body?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
}

// Web Push implementation using VAPID
async function sendWebPush(
  subscription: PushSubscription,
  payload: NotificationPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // For web push, we need to use the web-push library approach
    // Since we're in Deno, we'll use the native fetch with proper headers
    
    const payloadString = JSON.stringify(payload);
    const encodedPayload = new TextEncoder().encode(payloadString);
    
    // Create JWT for VAPID authentication
    const vapidJwt = await createVapidJwt(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey
    );
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Authorization': `vapid t=${vapidJwt}, k=${vapidPublicKey}`,
      },
      body: encodedPayload,
    });
    
    if (!response.ok) {
      console.error('Push failed:', response.status, await response.text());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error sending push:', error);
    return false;
  }
}

async function createVapidJwt(
  endpoint: string,
  publicKey: string,
  privateKey: string
): Promise<string> {
  const audience = new URL(endpoint).origin;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours
  
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: expiry,
    sub: 'mailto:notifications@novabehavior.com'
  };
  
  const encodedHeader = btoa(JSON.stringify(header))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
    
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  // Import the private key and sign
  const keyData = base64UrlToArrayBuffer(privateKey);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signatureInput)
  );
  
  const encodedSignature = arrayBufferToBase64Url(signature);
  
  return `${signatureInput}.${encodedSignature}`;
}

function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check - require authentication for all paths
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate the JWT
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    const body = await req.json();
    const { 
      test,
      userId, 
      userIds,
      notification,
      notificationType 
    } = body;

    // Handle test notification
    if (test) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user's subscriptions
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("subscription")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (!subscriptions || subscriptions.length === 0) {
        return new Response(
          JSON.stringify({ error: "No active subscriptions found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const testPayload: NotificationPayload = {
        title: "Test Notification",
        message: "Push notifications are working!",
        url: "/",
        tag: "test"
      };

      let sent = 0;
      for (const sub of subscriptions) {
        const success = await sendWebPush(
          sub.subscription as PushSubscription,
          testPayload,
          vapidPublicKey,
          vapidPrivateKey
        );
        if (success) sent++;
      }

      return new Response(
        JSON.stringify({ success: sent > 0, sent, total: subscriptions.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle targeted notification
    if (notification && (userId || userIds)) {
      const targetUserIds = userIds || [userId];
      
      // Get subscriptions for target users
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("user_id, subscription")
        .in("user_id", targetUserIds)
        .eq("is_active", true);

      if (!subscriptions || subscriptions.length === 0) {
        return new Response(
          JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check user preferences if notification type provided
      if (notificationType) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, push_enabled, push_preferences")
          .in("user_id", targetUserIds);

        const allowedUsers = new Set(
          (profiles || [])
            .filter(p => {
              if (!p.push_enabled) return false;
              const prefs = p.push_preferences as Record<string, boolean> | null;
              return !prefs || prefs[notificationType] !== false;
            })
            .map(p => p.user_id)
        );

        // Filter subscriptions by allowed users
        const filteredSubs = subscriptions.filter(s => allowedUsers.has(s.user_id));
        
        let sent = 0;
        for (const sub of filteredSubs) {
          const success = await sendWebPush(
            sub.subscription as PushSubscription,
            notification as NotificationPayload,
            vapidPublicKey,
            vapidPrivateKey
          );
          if (success) sent++;
        }

        return new Response(
          JSON.stringify({ success: true, sent, total: filteredSubs.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send to all subscriptions
      let sent = 0;
      for (const sub of subscriptions) {
        const success = await sendWebPush(
          sub.subscription as PushSubscription,
          notification as NotificationPayload,
          vapidPublicKey,
          vapidPrivateKey
        );
        if (success) sent++;
      }

      return new Response(
        JSON.stringify({ success: true, sent, total: subscriptions.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
