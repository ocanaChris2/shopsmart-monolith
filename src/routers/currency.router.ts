import { Router, RequestHandler } from "express";
import { currencyController } from "../controllers/currency.controller";

const router = Router();

// Currency routes
router.get("/", currencyController.getAll.bind(currencyController) as RequestHandler);
router.get("/:id", currencyController.getById.bind(currencyController) as RequestHandler);
router.post("/", currencyController.create.bind(currencyController) as RequestHandler);
router.put("/:id", currencyController.update.bind(currencyController) as RequestHandler);
router.delete("/:id", currencyController.delete.bind(currencyController) as RequestHandler);

export default router;
