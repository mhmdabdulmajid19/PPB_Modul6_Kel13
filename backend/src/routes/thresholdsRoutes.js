import express from "express";
import { ThresholdsController } from "../controllers/thresholdsController.js";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET routes bisa diakses tanpa login (optional auth)
router.get("/", optionalAuthMiddleware, ThresholdsController.list);
router.get("/latest", optionalAuthMiddleware, ThresholdsController.latest);

// POST route harus login (protected)
router.post("/", authMiddleware, ThresholdsController.create);

export default router;