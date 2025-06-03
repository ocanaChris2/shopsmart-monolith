import { Router, RequestHandler } from "express";
import { employeeController } from "../controllers/employee.controller";

const router = Router();

// Employee routes
router.get("/", employeeController.getAll.bind(employeeController) as RequestHandler);
router.get("/:id", employeeController.getById.bind(employeeController) as RequestHandler);
router.post("/", employeeController.create.bind(employeeController) as RequestHandler);
router.put("/:id", employeeController.update.bind(employeeController) as RequestHandler);
router.delete("/:id", employeeController.delete.bind(employeeController) as RequestHandler);

export default router;
