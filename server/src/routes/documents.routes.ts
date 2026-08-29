import { Router } from "express";
import { DocumentsController } from "../controllers/documents.controller.js";
import { validateBody, ingestRequestSchema } from "../middleware/validation.js";

export function createDocumentRoutes(controller: DocumentsController): Router {
  const router = Router();

  router.get("/", controller.list.bind(controller));
  router.get("/stats", controller.stats.bind(controller));
  router.get("/:id", controller.getById.bind(controller));
  router.post("/", validateBody(ingestRequestSchema), controller.create.bind(controller));
  router.delete("/:id", controller.delete.bind(controller));
  router.post("/reindex", controller.reindex.bind(controller));

  return router;
}
