import express from "express";
import { notificationService } from "../services/notificationService.js";

const router = express.Router();

/**
 * POST /api/notifications/register
 * Register device token untuk menerima notifikasi
 */
router.post("/register", (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const success = notificationService.registerToken(token);

    if (success) {
      res.json({ 
        message: "Token registered successfully",
        token: token.substring(0, 20) + "..." 
      });
    } else {
      res.status(400).json({ error: "Invalid token format" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notifications/unregister
 * Unregister device token
 */
router.post("/unregister", (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const success = notificationService.unregisterToken(token);
    
    if (success) {
      res.json({ message: "Token unregistered successfully" });
    } else {
      res.status(404).json({ error: "Token not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notifications/send
 * Kirim notifikasi manual (untuk testing)
 */
router.post("/send", async (req, res) => {
  try {
    const { title, body, data, tokens } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: "Title and body are required" });
    }

    let result;
    if (tokens && Array.isArray(tokens)) {
      // Kirim ke specific tokens
      result = await Promise.all(
        tokens.map((token) => 
          notificationService.sendToDevice(token, title, body, data)
        )
      );
    } else {
      // Kirim ke semua devices
      result = await notificationService.sendToAll(title, body, data);
    }

    res.json({ message: "Notifications sent", result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/notifications/tokens
 * Get daftar registered tokens (untuk debugging)
 */
router.get("/tokens", (req, res) => {
  try {
    const tokens = Array.from(notificationService.registeredTokens);
    res.json({ 
      count: tokens.length,
      tokens: tokens.map(t => t.substring(0, 30) + "...")
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;