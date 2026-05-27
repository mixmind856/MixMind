/* eslint-disable no-undef */
self.addEventListener("install", () => {
  console.log("[dj-sw] installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[dj-sw] activated");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  console.log("[dj-sw] push received");

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "New song request",
      body: event.data?.text() || "You have a new song request"
    };
  }

  console.log("[dj-sw] parsed payload:", JSON.stringify(data));

  const title = data.title || "New song request";
  const options = {
    body: data.body || "",
    icon: "/QR.png",
    badge: "/QR.png",
    data: {
      url: data.url || "/"
    }
  };

  console.log("[dj-sw] before showNotification", title, options.body);

  event.waitUntil(
    Promise.resolve(self.registration.showNotification(title, options))
      .then(() => {
        console.log("[dj-sw] after showNotification");
      })
      .catch((err) => {
        console.error("[dj-sw] showNotification failed:", err);
        throw err;
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
