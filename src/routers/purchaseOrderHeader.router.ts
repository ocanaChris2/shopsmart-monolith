import { Router, RequestHandler } from "express";
import { purchaseOrderHeaderController } from "../controllers/purchaseOrderHeader.controller";

const router = Router();

// PurchaseOrderHeader routes
router.get("/", purchaseOrderHeaderController.getAll.bind(purchaseOrderHeaderController) as RequestHandler);
router.get("/:id", purchaseOrderHeaderController.getById.bind(purchaseOrderHeaderController) as RequestHandler);
router.post("/", purchaseOrderHeaderController.create.bind(purchaseOrderHeaderController) as RequestHandler);
router.put("/:id", purchaseOrderHeaderController.update.bind(purchaseOrderHeaderController) as RequestHandler);
router.delete("/:id", purchaseOrderHeaderController.delete.bind(purchaseOrderHeaderController) as RequestHandler);

export default router;
