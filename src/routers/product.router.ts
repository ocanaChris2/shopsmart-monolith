import { Router, RequestHandler } from "express";
import { productController } from "../controllers/product.controller";

const router = Router();

// Product routes
router.get("/", productController.getAll.bind(productController) as RequestHandler);
router.get("/:id", productController.getById.bind(productController) as RequestHandler);
router.post("/", productController.create.bind(productController) as RequestHandler);
router.put("/:id", productController.update.bind(productController) as RequestHandler);
router.delete("/:id", productController.delete.bind(productController) as RequestHandler);

export default router;
