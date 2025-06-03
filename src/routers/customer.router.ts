import { Router, RequestHandler } from "express";
import { customerController } from "../controllers/customer.controller";

const router = Router();

// Customer routes
router.get("/", customerController.getAll.bind(customerController) as RequestHandler);
router.get("/:id", customerController.getById.bind(customerController) as RequestHandler);
router.post("/", customerController.create.bind(customerController) as RequestHandler);
router.put("/:id", customerController.update.bind(customerController) as RequestHandler);
router.delete("/:id", customerController.delete.bind(customerController) as RequestHandler);

export default router;
