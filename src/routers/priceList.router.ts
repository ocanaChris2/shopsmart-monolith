import { Router, RequestHandler } from "express";
import { priceListController } from "../controllers/priceList.controller";

const router = Router();

// PriceList routes
router.get("/", priceListController.getAll.bind(priceListController) as RequestHandler);
router.get("/:id", priceListController.getById.bind(priceListController) as RequestHandler);
router.post("/", priceListController.create.bind(priceListController) as RequestHandler);
router.put("/:id", priceListController.update.bind(priceListController) as RequestHandler);
router.delete("/:id", priceListController.delete.bind(priceListController) as RequestHandler);

export default router;
