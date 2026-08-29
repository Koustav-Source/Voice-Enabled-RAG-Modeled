import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

async function main() {
  try {
    const { app } = await createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Voice RAG Server running`, {
        port: env.PORT,
        env: env.NODE_ENV,
        url: `http://localhost:${env.PORT}`,
      });
      console.log(`\n✅ Server running at http://localhost:${env.PORT}`);
      console.log(`   Health: http://localhost:${env.PORT}/api/health`);
      console.log(`   Config: http://localhost:${env.PORT}/api/config`);
      console.log(`   Chat: POST http://localhost:${env.PORT}/api/chat`);
      console.log(`   Voice: POST http://localhost:${env.PORT}/api/voice/transcribe`);
      console.log(`   Docs: GET http://localhost:${env.PORT}/api/documents\n`);

      if (!env.GEMINI_API_KEY && !env.OPENAI_API_KEY) {
        console.log("⚠️  No LLM API key configured — using mock grounded provider");
        console.log("   Set GEMINI_API_KEY in .env for real generation\n");
      }
    });

    // Graceful shutdown
    const shutdown = () => {
      logger.info("Shutting down server...");
      server.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (err: any) {
    logger.error("Failed to start server", { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

main();
