import { Router } from "express";
import { VoiceController } from "../controllers/voice.controller.js";
import { validateBody, transcribeRequestSchema } from "../middleware/validation.js";

export function createVoiceRoutes(controller: VoiceController): Router {
  const router = Router();

  router.post("/transcribe", validateBody(transcribeRequestSchema), controller.transcribeAndChat.bind(controller));
  router.get("/config", controller.getVoiceConfig.bind(controller));

  return router;
}
