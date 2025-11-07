import crypto from "crypto";

/**
 * Service untuk mengirim push notification menggunakan Expo Push API
 * Dengan enkripsi private key untuk keamanan
 */

class NotificationService {
  constructor() {
    // Simpan token devices yang terdaftar
    this.registeredTokens = new Set();
    
    // Private key untuk enkripsi (simpan di environment variable)
    this.privateKey = process.env.NOTIFICATION_PRIVATE_KEY || "your-secret-key-here";
    
    // Expo Push API endpoint
    this.expoPushUrl = "https://exp.host/--/api/v2/push/send";
  }

  /**
   * Enkripsi data sensitif
   */
  encrypt(text) {
    const cipher = crypto.createCipher("aes-256-cbc", this.privateKey);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  }

  /**
   * Dekripsi data
   */
  decrypt(encryptedText) {
    const decipher = crypto.createDecipher("aes-256-cbc", this.privateKey);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  /**
   * Register device token
   */
  registerToken(token) {
    if (token && token.startsWith("ExponentPushToken[")) {
      this.registeredTokens.add(token);
      console.log(`Token registered: ${token.substring(0, 30)}...`);
      return true;
    }
    return false;
  }

  /**
   * Unregister device token
   */
  unregisterToken(token) {
    return this.registeredTokens.delete(token);
  }

  /**
   * Kirim notifikasi ke satu device
   */
  async sendToDevice(token, title, body, data = {}) {
    try {
      const message = {
        to: token,
        sound: "default",
        title,
        body,
        data,
        priority: "high",
        channelId: "default",
      };

      const response = await fetch(this.expoPushUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      
      if (result.data && result.data[0].status === "error") {
        console.error("Push notification error:", result.data[0].message);
        return { success: false, error: result.data[0].message };
      }

      return { success: true, result };
    } catch (error) {
      console.error("Failed to send push notification:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Kirim notifikasi ke semua devices terdaftar
   */
  async sendToAll(title, body, data = {}) {
    const tokens = Array.from(this.registeredTokens);
    
    if (tokens.length === 0) {
      console.log("No registered tokens");
      return { success: false, message: "No registered tokens" };
    }

    const messages = tokens.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data,
      priority: "high",
      channelId: "default",
    }));

    try {
      const response = await fetch(this.expoPushUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log(`Sent notifications to ${tokens.length} devices`);
      return { success: true, result };
    } catch (error) {
      console.error("Failed to send bulk notifications:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Kirim notifikasi untuk temperature alert
   */
  async sendTemperatureAlert(temperature, threshold, tokens = null) {
    const title = "🚨 Temperature Alert!";
    const body = `Temperature ${temperature.toFixed(2)}°C exceeded threshold ${threshold.toFixed(2)}°C`;
    const data = {
      type: "temperature_alert",
      temperature,
      threshold,
      timestamp: new Date().toISOString(),
      encrypted: this.encrypt(JSON.stringify({ temperature, threshold })),
    };

    if (tokens) {
      // Kirim ke specific tokens
      const results = await Promise.all(
        tokens.map((token) => this.sendToDevice(token, title, body, data))
      );
      return results;
    } else {
      // Kirim ke semua devices
      return await this.sendToAll(title, body, data);
    }
  }

  /**
   * Kirim notifikasi untuk data baru
   */
  async sendNewDataNotification(temperature, tokens = null) {
    const title = "📊 New Temperature Reading";
    const body = `Temperature: ${temperature.toFixed(2)}°C`;
    const data = {
      type: "new_reading",
      temperature,
      timestamp: new Date().toISOString(),
    };

    if (tokens) {
      const results = await Promise.all(
        tokens.map((token) => this.sendToDevice(token, title, body, data))
      );
      return results;
    } else {
      return await this.sendToAll(title, body, data);
    }
  }
}

export const notificationService = new NotificationService();