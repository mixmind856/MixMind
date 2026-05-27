const API = import.meta.env.VITE_API_URL;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser");
  }

  const registration = await navigator.serviceWorker.register("/dj-sw.js");

  console.log("[dj-push] registration.scope:", registration.scope);
  console.log("[dj-push] registration.active?.state:", registration.active?.state);
  console.log("[dj-push] Notification.permission:", Notification.permission);

  try {
    await registration.update();
  } catch (err) {
    console.warn("[dj-push] registration.update() failed:", err);
  }

  return registration;
}

export async function getVapidPublicKey() {
  const res = await fetch(`${API}/dj/push/public-key`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Push notifications are not configured");
  }
  const data = await res.json();
  return data.publicKey;
}

export async function fetchPushStatus(venueId, djToken) {
  const res = await fetch(
    `${API}/dj/push/status?venueId=${encodeURIComponent(venueId)}`,
    {
      headers: { Authorization: `Bearer ${djToken}` }
    }
  );
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export async function subscribeToPush(venueId, djToken) {
  const publicKey = await getVapidPublicKey();
  await registerServiceWorker();
  const registration = await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  console.log("[dj-push] Notification.permission after request:", permission);

  if (Notification.permission !== "granted") {
    throw new Error(
      "Browser notifications are blocked. Allow notifications in your browser settings for this site."
    );
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  }

  const subJson = subscription.toJSON();
  const res = await fetch(`${API}/dj/push/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${djToken}`
    },
    body: JSON.stringify({
      venueId,
      subscription: {
        endpoint: subJson.endpoint,
        keys: subJson.keys
      },
      userAgent: navigator.userAgent
    })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to save push subscription");
  }

  return res.json();
}

export async function unsubscribeFromPush(venueId, djToken) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  const endpoint = subscription?.endpoint;

  if (subscription) {
    await subscription.unsubscribe();
  }

  const res = await fetch(`${API}/dj/push/unsubscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${djToken}`
    },
    body: JSON.stringify({ venueId, endpoint })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to remove push subscription");
  }

  return res.json();
}

export async function setPushAvailability(venueId, online, djToken) {
  const res = await fetch(`${API}/dj/push/availability`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${djToken}`
    },
    body: JSON.stringify({ venueId, online })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update availability");
  }

  return res.json();
}
