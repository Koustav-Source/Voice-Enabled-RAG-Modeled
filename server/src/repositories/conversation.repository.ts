import { Conversation, ChatMessage } from "../types/chat.js";
import { v4 as uuidv4 } from "uuid";

export class ConversationRepository {
  private conversations: Map<string, Conversation> = new Map();
  private maxMessagesPerConversation = 50;
  private maxConversations = 1000;

  create(sessionId?: string): Conversation {
    const id = sessionId || uuidv4();
    const now = new Date().toISOString();
    const convo: Conversation = {
      sessionId: id,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, convo);

    // LRU cleanup if too many
    if (this.conversations.size > this.maxConversations) {
      const oldest = Array.from(this.conversations.values()).sort(
        (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      )[0];
      if (oldest) this.conversations.delete(oldest.sessionId);
    }

    return convo;
  }

  get(sessionId: string): Conversation | null {
    return this.conversations.get(sessionId) || null;
  }

  getOrCreate(sessionId?: string): Conversation {
    if (sessionId) {
      const existing = this.get(sessionId);
      if (existing) return existing;
    }
    return this.create(sessionId);
  }

  addMessage(sessionId: string, message: ChatMessage): Conversation {
    const convo = this.getOrCreate(sessionId);
    convo.messages.push(message);
    convo.updatedAt = new Date().toISOString();

    // Trim if too long (keep recent)
    if (convo.messages.length > this.maxMessagesPerConversation) {
      convo.messages = convo.messages.slice(-this.maxMessagesPerConversation);
    }

    this.conversations.set(convo.sessionId, convo);
    return convo;
  }

  getHistory(sessionId: string, limit = 10): ChatMessage[] {
    const convo = this.get(sessionId);
    if (!convo) return [];
    return convo.messages.slice(-limit);
  }

  clear(sessionId: string): boolean {
    return this.conversations.delete(sessionId);
  }

  getAllSessionIds(): string[] {
    return Array.from(this.conversations.keys());
  }
}
