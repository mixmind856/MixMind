const SESSION_KEY = "mixmind_analytics_session_id";
const SRC_KEY = "mixmind_analytics_src";

export function getOrCreateSessionId() {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

export function setAnalyticsSrc(src) {
  try {
    if (src != null && String(src).trim() !== "") {
      sessionStorage.setItem(SRC_KEY, String(src).trim().slice(0, 64));
    }
  } catch {
    /* ignore */
  }
}

export function getAnalyticsContext() {
  try {
    return {
      sessionId: sessionStorage.getItem(SESSION_KEY) || "",
      src: sessionStorage.getItem(SRC_KEY) || "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : ""
    };
  } catch {
    return { sessionId: "", src: "", userAgent: "" };
  }
}

export function trackAnalyticsEvent(payload) {
  const base = import.meta.env.VITE_API_URL;
  if (!base) return;

  const ctx = getAnalyticsContext();
  const bodyObj = {
    ...payload,
    sessionId: payload.sessionId ?? ctx.sessionId,
    src: payload.src ?? ctx.src ?? "",
    userAgent:
      payload.userAgent ??
      (typeof navigator !== "undefined" ? navigator.userAgent : ""),
    metadata:
      payload.metadata && typeof payload.metadata === "object"
        ? payload.metadata
        : {}
  };

  const url = `${base.replace(/\/$/, "")}/analytics/event`;
  const body = JSON.stringify(bodyObj);

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }
  } catch {
    /* fall through */
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => {});
}
