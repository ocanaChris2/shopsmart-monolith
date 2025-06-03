import { Router, RequestHandler } from "express";
import { purchaseOrderDetailController } from "../controllers/purchaseOrderDetail.controller";

const router = Router();

// PurchaseOrderDetail routes
router.get("/", purchaseOrderDetailController.getAll.bind(purchaseOrderDetailController) as RequestHandler);
router.get("/:id", purchaseOrderDetailController.getById.bind(purchaseOrderDetailController) as RequestHandler);
router.post("/", purchaseOrderDetailController.create.bind(purchaseOrderDetailController) as RequestHandler);
router.put("/:id", purchaseOrderDetailController.update.bind(purchaseOrderDetailController) as RequestHandler);
router.delete("/:id", purchaseOrderDetailController.delete.bind(purchaseOrderDetailController) as RequestHandler);

export default router;
