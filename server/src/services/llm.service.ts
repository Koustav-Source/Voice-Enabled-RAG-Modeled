import OpenAI from "openai";
import { LLMProvider } from "../types/rag.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export class GeminiProvider implements LLMProvider {
  model: string;
  private client: OpenAI | null = null;

  constructor() {
    this.model = env.GEMINI_MODEL;
    if (env.GEMINI_API_KEY) {
      this.client = new OpenAI({
        apiKey: env.GEMINI_API_KEY,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      });
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  async generate(prompt: string, options?: { systemPrompt?: string; temperature?: number; maxTokens?: number }): Promise<string> {
    if (!this.client) {
      throw new Error("Gemini API key not configured");
    }

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      if (options?.systemPrompt) {
        messages.push({ role: "system", content: options.systemPrompt });
      }
      messages.push({ role: "user", content: prompt });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 1000,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("Empty response from Gemini");
      }
      return content;
    } catch (err: any) {
      logger.error("Gemini generation failed", { error: err.message, model: this.model });
      throw new Error(`LLM generation failed: ${err.message}`);
    }
  }
}

export class OpenAIProvider implements LLMProvider {
  model: string;
  private client: OpenAI | null = null;

  constructor() {
    this.model = "gpt-4o-mini";
    if (env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  async generate(prompt: string, options?: { systemPrompt?: string; temperature?: number; maxTokens?: number }): Promise<string> {
    if (!this.client) throw new Error("OpenAI API key not configured");

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (options?.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1000,
    });

    return response.choices[0]?.message?.content?.trim() || "No answer generated";
  }
}

export class MockProvider implements LLMProvider {
  model = "mock-grounded-llm";

  isConfigured(): boolean {
    return true;
  }

  async generate(prompt: string, options?: { systemPrompt?: string }): Promise<string> {
    // Extract context if present
    const contextMatch = options?.systemPrompt?.match(/RETRIEVED EVIDENCE:\n([\s\S]*?)\n\nRemember:/);
    const hasContext = contextMatch && contextMatch[1] && !contextMatch[1].includes("NO_RELEVANT_CONTEXT");

    if (!hasContext || options?.systemPrompt?.includes("NO relevant retrieved context")) {
      return "I couldn't find sufficient information in the connected knowledge base to answer that reliably. The current knowledge base contains information about Baga Beach, Anjuna Beach, Calangute Beach, Fort Aguada, Chapora Fort, and general North/South Goa. Could you ask about one of those topics?";
    }

    // Simple grounded mock: return first 2 sentences from context
    const context = contextMatch ? contextMatch[1] : "";
    const sentences = context.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(0, 3);
    
    if (sentences.length === 0) {
      return "Based on the retrieved information, I found some relevant context but need more specific details to provide a complete answer. Could you clarify your question about Goa?";
    }

    // Extract question
    const questionMatch = prompt.match(/User question: "([^"]+)"|Answer the original question: "([^"]+)"/);
    const question = questionMatch ? (questionMatch[1] || questionMatch[2]) : "your question";

    return `Based on the retrieved knowledge base [1], here's what I found about "${question}":\n\n${sentences.join(". ")}. \n\nThis information comes from the Goa Tourism knowledge base. [1]`;
  }
}

export function createLLMProvider(): LLMProvider {
  // Priority: Gemini if key exists, else OpenAI, else Mock
  if (env.GEMINI_API_KEY) {
    logger.info(`Using Gemini LLM provider: ${env.GEMINI_MODEL}`);
    return new GeminiProvider();
  }
  if (env.OPENAI_API_KEY) {
    logger.info("Using OpenAI LLM provider");
    return new OpenAIProvider();
  }
  logger.warn("No LLM API key configured, using mock provider (grounded fallback)");
  return new MockProvider();
}
