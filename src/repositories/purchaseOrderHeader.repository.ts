import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { stringifyWithDates, parseWithDates } from '../utils/dateUtils';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

const CACHE_TTL = 60 * 60; // 1 hour

function getCacheKey(method: string, identifier: string | number): string {
  return `purchaseOrderHeader:${method}:${identifier}`;
}

export const getAllPurchaseOrderHeaders = async () => {
  const cacheKey = getCacheKey('all', '');
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return parseWithDates(cached);
    
    const orders = await prisma.purchaseOrderHeader.findMany({
      include: {
        details: {
          include: {
            product: true
          }
        }
      }
    });
    await redis.setex(cacheKey, CACHE_TTL, stringifyWithDates(orders));
    return orders;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.purchaseOrderHeader.findMany({
      include: {
        details: {
          include: {
            product: true
          }
        }
      }
    });
  }
};

export const getPurchaseOrderHeaderById = async (po_number: string) => {
  const cacheKey = getCacheKey('byId', po_number);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return parseWithDates(cached);
    
    const order = await prisma.purchaseOrderHeader.findUnique({
      where: { po_number },
      include: {
        details: {
          include: {
            product: true
          }
        }
      }
    });
    if (order) {
      await redis.setex(cacheKey, CACHE_TTL, stringifyWithDates(order));
    }
    return order;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.purchaseOrderHeader.findUnique({
      where: { po_number },
      include: {
        details: {
          include: {
            product: true
          }
        }
      }
    });
  }
};

export const createPurchaseOrderHeader = async (data: {
  po_number: string;
  order_date: Date;
  total_amount: number;
  status: string;
}) => {
  const order = await prisma.purchaseOrderHeader.create({
    data,
    include: {
      details: {
        include: {
          product: true
        }
      }
    }
  });
  // Invalidate all orders cache since we added a new one
  await redis.del(getCacheKey('all', '')).catch(console.error);
  return order;
};

export const updatePurchaseOrderHeader = async (po_number: string, data: {
  total_amount?: number;
  status?: string;
}) => {
  const order = await prisma.purchaseOrderHeader.update({
    where: { po_number },
    data,
    include: {
      details: {
        include: {
          product: true
        }
      }
    }
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('byId', po_number)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return order;
};

export const deletePurchaseOrderHeader = async (po_number: string) => {
  const result = await prisma.purchaseOrderHeader.delete({
    where: { po_number }
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('byId', po_number)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return result;
};
