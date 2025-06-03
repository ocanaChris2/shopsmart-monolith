import { Router, RequestHandler } from "express";
import { companyController } from "../controllers/company.controller";
import { AuthService } from "../services/auth.service";

const router = Router();

// Company routes
router.get("/", companyController.getAll);
router.get("/:id", AuthService.authenticate, companyController.getById);
router.post("/", AuthService.authenticate, companyController.create);
router.put("/:id", AuthService.authenticate, companyController.update);
router.delete("/:id", AuthService.authenticate, companyController.delete);

export default router;
