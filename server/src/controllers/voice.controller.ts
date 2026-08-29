import { Request, Response, NextFunction } from "express";
import { RAGService } from "../services/rag.service.js";
import { ConversationRepository } from "../repositories/conversation.repository.js";
import { ChatMessage } from "../types/chat.js";
import { logger } from "../utils/logger.js";

export class VoiceController {
  constructor(
    private ragService: RAGService,
    private conversationRepo: ConversationRepository
  ) {}

  async transcribeAndChat(req: Request, res: Response, next: NextFunction) {
    try {
      const { transcript, sessionId } = req.body;
      const requestId = (req as any).requestId;

      if (!transcript || transcript.trim().length === 0) {
        return res.status(400).json({
          requestId,
          error: "VALIDATION_ERROR",
          message: "Transcript is required",
        });
      }

      logger.info("Voice transcribe+chat", { requestId, transcript: transcript.slice(0, 100) });

      const conversation = this.conversationRepo.getOrCreate(sessionId);
      const history = conversation.messages.slice(-10);

      const result = await this.ragService.query(transcript, {
        conversationHistory: history,
        sessionId: conversation.sessionId,
      });

      const userMsg: ChatMessage = {
        role: "user",
        content: transcript,
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

      res.json({
        requestId,
        sessionId: conversation.sessionId,
        transcript,
        answer: result.answer,
        grounded: result.grounded,
        sources: result.sources,
        retrieval: result.retrieval,
        timing: result.timing,
      });
    } catch (err) {
      next(err);
    }
  }

  async getVoiceConfig(req: Request, res: Response) {
    res.json({
      stt: {
        provider: "browser",
        supported: true,
        language: "en-IN",
        fallback: "text",
      },
      tts: {
        provider: "browser",
        supported: true,
        language: "en-IN",
      },
      instructions: {
        stt: "Browser SpeechRecognition API with server fallback planned",
        tts: "Browser SpeechSynthesis API with provider abstraction",
      },
    });
  }
}
