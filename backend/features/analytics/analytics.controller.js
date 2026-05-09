const AnalyticsEvent = require("../../models/AnalyticsEvent");
const { ALLOWED_EVENT_TYPES } = AnalyticsEvent;

function normalizePayload(body, req) {
  const eventType = typeof body.eventType === "string" ? body.eventType.trim() : "";
  const venueId =
    body.venueId === undefined || body.venueId === null || body.venueId === ""
      ? undefined
      : String(body.venueId).trim();
  const venueName =
    typeof body.venueName === "string" && body.venueName.trim()
      ? body.venueName.trim().slice(0, 200)
      : undefined;
  const src =
    typeof body.src === "string" ? body.src.trim().slice(0, 64) : "";
  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim().slice(0, 128) : "";
  const userAgent =
    typeof body.userAgent === "string" && body.userAgent.trim()
      ? body.userAgent.trim().slice(0, 512)
      : req.get("user-agent") || "";
  let metadata = body.metadata;
  if (!metadata || typeof metadata !== "object") metadata = {};
  return { eventType, venueId, venueName, src, sessionId, userAgent, metadata };
}

async function postAnalyticsEvent(req, res) {
  try {
    const payload = normalizePayload(req.body || {}, req);
    if (!ALLOWED_EVENT_TYPES.includes(payload.eventType)) {
      return res.status(400).json({ ok: false, error: "invalid eventType" });
    }

    if (
      payload.eventType !== "qr_scan_landing" &&
      (!payload.venueId || payload.venueId.length === 0)
    ) {
      return res.status(400).json({ ok: false, error: "venueId required for this event" });
    }

    await AnalyticsEvent.create({
      eventType: payload.eventType,
      venueId: payload.venueId,
      venueName: payload.venueName,
      src: payload.src || "",
      sessionId: payload.sessionId || "",
      userAgent: payload.userAgent,
      metadata: payload.metadata,
      createdAt: new Date()
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[analytics] event save error:", err.message);
    return res.status(200).json({ ok: true });
  }
}

module.exports = { postAnalyticsEvent };
