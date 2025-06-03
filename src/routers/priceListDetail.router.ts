import { Router, RequestHandler } from "express";
import { priceListDetailController } from "../controllers/priceListDetail.controller";

const router = Router();

// PriceListDetail routes
router.get("/", priceListDetailController.getAll.bind(priceListDetailController) as RequestHandler);
router.get("/:id", priceListDetailController.getById.bind(priceListDetailController) as RequestHandler);
router.post("/", priceListDetailController.create.bind(priceListDetailController) as RequestHandler);
router.put("/:id", priceListDetailController.update.bind(priceListDetailController) as RequestHandler);
router.delete("/:id", priceListDetailController.delete.bind(priceListDetailController) as RequestHandler);

export default router;
