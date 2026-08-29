import { Request, Response, NextFunction } from "express";
import { RAGService } from "../services/rag.service.js";
import { ConversationRepository } from "../repositories/conversation.repository.js";
import { ChatMessage } from "../types/chat.js";
import { logger } from "../utils/logger.js";

export class ChatController {
  constructor(
    private ragService: RAGService,
    private conversationRepo: ConversationRepository
  ) {}

  async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, sessionId, topK, includeDebug } = req.body;
      const requestId = (req as any).requestId;

      const conversation = this.conversationRepo.getOrCreate(sessionId);
      const history = conversation.messages.slice(-10);

      logger.info("Chat request", { requestId, sessionId: conversation.sessionId, message: message.slice(0, 100) });

      const result = await this.ragService.query(message, {
        topK,
        conversationHistory: history,
        sessionId: conversation.sessionId,
      });

      // Save to conversation
      const userMsg: ChatMessage = {
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: result.answer,
        timestamp: new Date().toISOString(),
        sources: result.sources,
      };

      this.conversationRepo.addMessage(conversation.sessionId, userMsg);
      this.conversationRepo.addMessage(conversation.sessionId, assistantMsg);

      const response: any = {
        requestId,
        sessionId: conversation.sessionId,
        answer: result.answer,
        grounded: result.grounded,
        sources: result.sources,
        retrieval: {
          query: result.retrieval.query,
          rewrittenQuery: result.retrieval.rewrittenQuery,
          topK: result.retrieval.topK,
          returned: result.retrieval.returned,
        },
        timing: result.timing,
        conversation: {
          messageCount: this.conversationRepo.get(conversation.sessionId)!.messages.length,
        },
      };

      if (includeDebug) {
        response.debug = {
          retrievedChunks: result.retrieval.results,
          contextLength: result.retrieval.results.reduce((sum, c) => sum + c.content.length, 0),
          promptLength: 0, // could be calculated
        };
      }

      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async getConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const convo = this.conversationRepo.get(sessionId);
      if (!convo) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Conversation not found" });
      }
      res.json(convo);
    } catch (err) {
      next(err);
    }
  }

  async clearConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const deleted = this.conversationRepo.clear(sessionId);
      res.json({ cleared: deleted, sessionId });
    } catch (err) {
      next(err);
    }
  }
}
