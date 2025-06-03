import { Router, RequestHandler } from "express";
import { salesOrderHeaderController } from "../controllers/salesOrderHeader.controller";

const router = Router();

// SalesOrderHeader routes
router.get("/", salesOrderHeaderController.getAll.bind(salesOrderHeaderController) as RequestHandler);
router.get("/:id", salesOrderHeaderController.getById.bind(salesOrderHeaderController) as RequestHandler);
router.post("/", salesOrderHeaderController.create.bind(salesOrderHeaderController) as RequestHandler);
router.put("/:id", salesOrderHeaderController.update.bind(salesOrderHeaderController) as RequestHandler);
router.delete("/:id", salesOrderHeaderController.delete.bind(salesOrderHeaderController) as RequestHandler);

export default router;
