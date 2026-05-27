const KEYS = {
  token: "djToken",
  id: "djId",
  email: "djEmail",
  name: "djName",
  lastVenueId: "djLastVenueId"
};

export function getDjSession() {
  if (typeof localStorage === "undefined") {
    return {
      djToken: null,
      djId: null,
      djEmail: null,
      djName: null,
      djLastVenueId: null
    };
  }

  return {
    djToken: localStorage.getItem(KEYS.token),
    djId: localStorage.getItem(KEYS.id),
    djEmail: localStorage.getItem(KEYS.email),
    djName: localStorage.getItem(KEYS.name),
    djLastVenueId: localStorage.getItem(KEYS.lastVenueId)
  };
}

export function setDjSession({ djToken, djId, djEmail, djName, djLastVenueId }) {
  if (typeof localStorage === "undefined") return;

  if (djToken != null) localStorage.setItem(KEYS.token, djToken);
  if (djId != null) localStorage.setItem(KEYS.id, String(djId));
  if (djEmail != null) localStorage.setItem(KEYS.email, djEmail);
  if (djName != null) localStorage.setItem(KEYS.name, djName);
  if (djLastVenueId != null) localStorage.setItem(KEYS.lastVenueId, String(djLastVenueId));
}

export function setDjLastVenueId(venueId) {
  if (typeof localStorage === "undefined" || venueId == null) return;
  localStorage.setItem(KEYS.lastVenueId, String(venueId));
}

export function clearDjSession() {
  if (typeof localStorage === "undefined") return;

  localStorage.removeItem(KEYS.token);
  localStorage.removeItem(KEYS.id);
  localStorage.removeItem(KEYS.email);
  localStorage.removeItem(KEYS.name);
  localStorage.removeItem(KEYS.lastVenueId);
}

export function hasDjSession() {
  const { djToken, djId } = getDjSession();
  return Boolean(djToken && djId);
}
