import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { AuthService } from "../services/auth.service";
import { prisma } from "../services/auth.service";

export const AuthController: Record<string, RequestHandler> = {
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      const passwordValidation = await AuthService.validatePasswordComplexity(
        password
      );
      if (!passwordValidation.valid) {
        res.status(400).json({ error: passwordValidation.message });
        return;
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(400).json({ error: "Email already in use" });
        return;
      }

      const passwordHash = await AuthService.hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: "USER",
          failedLoginAttempts: 0,
          lastFailedLogin: null,
          accountLockedUntil: null,
        },
      });

      const accessToken = AuthService.generateAccessToken(user);
      const refreshToken = AuthService.generateRefreshToken(user);

      await AuthService.saveRefreshToken(user.id, refreshToken);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: process.env.COOKIE_HTTPONLY === "true",
        secure: process.env.COOKIE_SECURE === "true",
        sameSite: process.env.COOKIE_SAMESITE as
          | "strict"
          | "lax"
          | "none"
          | boolean,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
      });

      res.status(201).json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      // Check if account is locked
      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        res.status(403).json({
          error: "Account locked",
          lockedUntil: user.accountLockedUntil,
        });
        return;
      }

      const isValidPassword = await AuthService.validatePassword(
        password,
        user.passwordHash
      );

      if (!isValidPassword) {
        // Increment failed attempts
        const failedAttempts = user.failedLoginAttempts + 1;
        let lockoutDuration = 0;

        // Lock account after 5 failed attempts
        if (failedAttempts >= 5) {
          // Exponential backoff: 5^(n-4) minutes
          lockoutDuration = Math.pow(5, failedAttempts - 4) * 60 * 1000;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: failedAttempts,
            lastFailedLogin: new Date(),
            accountLockedUntil:
              lockoutDuration > 0
                ? new Date(Date.now() + lockoutDuration)
                : null,
          },
        });

        res.status(401).json({
          error: "Invalid credentials",
          remainingAttempts: 5 - failedAttempts,
        });
        return;
      }

      // Reset failed attempts on successful login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lastFailedLogin: null,
          accountLockedUntil: null,
        },
      });

      const accessToken = AuthService.generateAccessToken(user);
      const refreshToken = AuthService.generateRefreshToken(user);

      await AuthService.saveRefreshToken(user.id, refreshToken);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: process.env.COOKIE_HTTPONLY === "true",
        secure: process.env.COOKIE_SECURE === "true",
        sameSite: process.env.COOKIE_SAMESITE as
          | "strict"
          | "lax"
          | "none"
          | boolean,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
      });

      res.json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  refreshToken: async (req: Request, res: Response, next: NextFunction) => {
    try {
      let refreshToken = req.cookies?.refreshToken;
      // In test environment, check headers if cookie not found
      if (
        process.env.NODE_ENV === "test" &&
        !refreshToken &&
        req.headers.cookie
      ) {
        const cookies = req.headers.cookie
          .split(";")
          .reduce((acc: Record<string, string>, cookie) => {
            const [name, value] = cookie.trim().split("=");
            acc[name] = value;
            return acc;
          }, {});
        refreshToken = cookies["refreshToken"];
      }

      if (!refreshToken) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }

      // Check if token is blacklisted
      const isBlacklisted = await AuthService.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        res.status(401).json({ error: "Unauthorized - token has been invalidated" });
        return;
      }

      // Verify token and get user
      const payload = await AuthService.verifyToken(refreshToken);
      if (!payload?.userId) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }

      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        res.status(403).json({
          error: "Account locked",
          lockedUntil: user.accountLockedUntil,
        });
        return;
      }

      // Validate refresh token
      if (!user.refreshToken) {
        res.status(401).json({ error: "Unauthorized - token invalidated" });
        return;
      }

      // Token rotation check
      if (user.refreshToken !== refreshToken) {
        res.status(401).json({ error: "Unauthorized - invalid token" });
        return;
      }

      const newAccessToken = AuthService.generateAccessToken(user);
      const newRefreshToken = AuthService.generateRefreshToken(user);

      await AuthService.saveRefreshToken(user.id, newRefreshToken);

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: process.env.COOKIE_HTTPONLY === "true",
        secure: process.env.COOKIE_SECURE === "true",
        sameSite: process.env.COOKIE_SAMESITE as
          | "strict"
          | "lax"
          | "none"
          | boolean,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
      });

      res.json({ accessToken: newAccessToken });
    } catch (error) {
      next(error);
    }
  },

  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.refreshToken;

      // Clear cookie regardless of token validity
      res.clearCookie("refreshToken", {
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
      });

      if (!refreshToken) {
        res.sendStatus(204);
        return;
      }

      try {
        // Try to get user ID from token
        const payload = await AuthService.verifyToken(refreshToken);

        if (payload?.userId) {
          // Use AuthService to clear and blacklist the token
          await AuthService.clearRefreshToken(payload.userId, refreshToken);
        } else {
          // If token is not valid but we still want to blacklist it
          await AuthService.blacklistToken(refreshToken);
        }
      } catch (error) {
        // If token verification fails, still blacklist the token
        console.error("Error during token verification on logout:", error);
        await AuthService.blacklistToken(refreshToken);
      }

      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  },
};
