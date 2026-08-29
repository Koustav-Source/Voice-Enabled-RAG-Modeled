import { Router } from "express";
import { ChatController } from "../controllers/chat.controller.js";
import { validateBody, chatRequestSchema } from "../middleware/validation.js";

export function createChatRoutes(controller: ChatController): Router {
  const router = Router();

  router.post("/", validateBody(chatRequestSchema), controller.chat.bind(controller));
  router.get("/conversation/:sessionId", controller.getConversation.bind(controller));
  router.delete("/conversation/:sessionId", controller.clearConversation.bind(controller));

  return router;
}
