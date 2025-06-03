import { Router, RequestHandler } from "express";
import { AuthController } from "../controllers/auth.controller";
import { AuthService } from "../services/auth.service";

const router = Router();

// Auth routes
router.post("/register", AuthController.register as RequestHandler);
router.post("/login", AuthController.login as RequestHandler);
router.post("/refresh-token", AuthController.refreshToken as RequestHandler);
router.post("/logout", AuthController.logout as RequestHandler);

// Protected test endpoint
router.get("/protected", AuthService.authenticate as RequestHandler, (req, res) => {
  res.json({ message: "Access granted to protected route" });
});

export default router;
