import { Router, RequestHandler } from "express";
import { departmentController } from "../controllers/department.controller";
import { AuthService } from "../services/auth.service";

const router = Router();

// Department routes - all protected
router.get("/", AuthService.authenticate as RequestHandler, departmentController.getAll.bind(departmentController) as RequestHandler);
router.get("/:id", AuthService.authenticate as RequestHandler, departmentController.getById.bind(departmentController) as RequestHandler);
router.post("/", AuthService.authenticate as RequestHandler, departmentController.create.bind(departmentController) as RequestHandler);
router.put("/:id", AuthService.authenticate as RequestHandler, departmentController.update.bind(departmentController) as RequestHandler);
router.delete("/:id", AuthService.authenticate as RequestHandler, departmentController.delete.bind(departmentController) as RequestHandler);

export default router;
