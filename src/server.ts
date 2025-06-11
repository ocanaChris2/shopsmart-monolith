import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError, AuthenticationError } from "./errors";
import Redis from "ioredis";
import { responseFormatter } from "./utils/responseFormatter";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import RedisStore, { RedisReply } from "rate-limit-redis";
import cors from "cors";
import { body, query } from 'express-validator';
import { AuthService } from "./services/auth.service";
import authRouter from "./routers/auth.router";
import productRouter from "./routers/product.router";
import customerRouter from "./routers/customer.router";
import employeeRouter from "./routers/employee.router";
import departmentRouter from "./routers/department.router";
import companyRouter from "./routers/company.router";
import currencyRouter from "./routers/currency.router";
import priceListRouter from "./routers/priceList.router";
import priceListDetailRouter from "./routers/priceListDetail.router";
import salesOrderHeaderRouter from "./routers/salesOrderHeader.router";
import salesOrderDetailRouter from "./routers/salesOrderDetail.router";
import purchaseOrderHeaderRouter from "./routers/purchaseOrderHeader.router";
import purchaseOrderDetailRouter from "./routers/purchaseOrderDetail.router";

const csrfProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => next();

const app = express();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || (process.env.NODE_ENV === 'test' ? "redis://localhost:6379" : "redis://redis:6379"), {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableOfflineQueue: true,
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  store: new RedisStore({
    sendCommand: async (command: string, ...args: (string | number)[]): Promise<RedisReply> => {
      try {
        const result = await redis.call(command, ...args);
        return result as RedisReply;
      } catch (err) {
        throw err;
      }
    }
  })
});
app.use(limiter);

// CSRF protection for all routes except GET/HEAD/OPTIONS
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
  } else {
    csrfProtection(req, res, next);
  }
});

// Add CSRF token endpoint
app.get('/api/csrf-token', (req: Request, res: Response) => {
  res.json({ csrfToken: (req as any).csrfToken() });
});

app.use(express.json({ limit: '10kb' }));

// Response formatter middleware
app.use(responseFormatter());

// Input validation and sanitization middleware
app.use([
  body('*').trim().escape(),
  query('*').trim().escape()
]);

// Enhanced security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"]
    }
  },
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true
}));

// Request validation
app.use(express.json({
  limit: '10kb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  }
}));

// API versioning
app.use((req, res, next) => {
  res.setHeader('X-API-Version', '1.0.0');
  next();
});

// Mount individual routers under /api prefix
app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/customers", customerRouter);
app.use("/api/employees", employeeRouter);
app.use("/api/departments", departmentRouter);
app.use("/api/companies", companyRouter);
app.use("/api/currencies", currencyRouter);
app.use("/api/price-lists", priceListRouter);
app.use("/api/price-list-details", priceListDetailRouter);
app.use("/api/sales-order-headers", salesOrderHeaderRouter);
app.use("/api/sales-order-details", salesOrderDetailRouter);
app.use("/api/purchase-order-headers", purchaseOrderHeaderRouter);
app.use("/api/purchase-order-details", purchaseOrderDetailRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy" });
});

// Protected route for testing authentication
app.get("/api/protected", AuthService.authenticate, (req: Request & { user?: { userId: number, role: string } }, res: Response) => {
  res.status(200).json({ 
    message: "Access granted", 
    userId: req.user?.userId,
    role: req.user?.role
  });
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
    } else if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
    } else if (err instanceof AuthenticationError) {
      res.status(401).json({ error: err.message });
    } else {
      res.status(500).json({ error: "Something went wrong!" });
    }
  }
);

async function startServer() {
  try {
    await prisma.$connect();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to database", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
