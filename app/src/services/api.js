import { BACKEND_URL } from "./config.js";

async function request(path, options = {}) {
  if (!BACKEND_URL) {
    throw new Error("BACKEND_URL is not set in app.json");
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

export const Api = {
  // Sensor Readings
  getSensorReadings() {
    return request("/api/readings");
  },

  // Thresholds
  getThresholds() {
    return request("/api/thresholds");
  },
  createThreshold(payload) {
    return request("/api/thresholds", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Push Notifications
  registerPushToken(token) {
    return request("/api/notifications/register", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },
  unregisterPushToken(token) {
    return request("/api/notifications/unregister", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },
  sendTestNotification(title, body, data = {}) {
    return request("/api/notifications/send", {
      method: "POST",
      body: JSON.stringify({ title, body, data }),
    });
  },
};