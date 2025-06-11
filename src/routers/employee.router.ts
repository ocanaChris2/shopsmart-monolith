import { Router, RequestHandler } from "express";
import { employeeController } from "../controllers/employee.controller";
import { AuthService } from "../services/auth.service";

const router = Router();

// Employee routes - all protected
router.get("/", AuthService.authenticate as RequestHandler, employeeController.getAll.bind(employeeController) as RequestHandler);
router.get("/:id", AuthService.authenticate as RequestHandler, employeeController.getById.bind(employeeController) as RequestHandler);
router.post("/", AuthService.authenticate as RequestHandler, employeeController.create.bind(employeeController) as RequestHandler);
router.put("/:id", AuthService.authenticate as RequestHandler, employeeController.update.bind(employeeController) as RequestHandler);
router.delete("/:id", AuthService.authenticate as RequestHandler, employeeController.delete.bind(employeeController) as RequestHandler);

export default router;
