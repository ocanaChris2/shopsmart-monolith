import { Router, RequestHandler } from "express";
import { departmentController } from "../controllers/department.controller";

const router = Router();

// Department routes
router.get("/", departmentController.getAll.bind(departmentController) as RequestHandler);
router.get("/:id", departmentController.getById.bind(departmentController) as RequestHandler);
router.post("/", departmentController.create.bind(departmentController) as RequestHandler);
router.put("/:id", departmentController.update.bind(departmentController) as RequestHandler);
router.delete("/:id", departmentController.delete.bind(departmentController) as RequestHandler);

export default router;
