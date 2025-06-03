import { Router, RequestHandler } from "express";
import { salesOrderDetailController } from "../controllers/salesOrderDetail.controller";

const router = Router();

// SalesOrderDetail routes
router.get("/", salesOrderDetailController.getAll.bind(salesOrderDetailController) as RequestHandler);
router.get("/:id", salesOrderDetailController.getById.bind(salesOrderDetailController) as RequestHandler);
router.post("/", salesOrderDetailController.create.bind(salesOrderDetailController) as RequestHandler);
router.put("/:id", salesOrderDetailController.update.bind(salesOrderDetailController) as RequestHandler);
router.delete("/:id", salesOrderDetailController.delete.bind(salesOrderDetailController) as RequestHandler);

export default router;
