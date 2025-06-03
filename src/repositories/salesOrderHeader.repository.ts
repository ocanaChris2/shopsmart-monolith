import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

const CACHE_TTL = 60 * 60; // 1 hour

function getCacheKey(method: string, identifier: string | number): string {
  return `salesOrderHeader:${method}:${identifier}`;
}

export const getAllSalesOrderHeaders = async () => {
  const cacheKey = getCacheKey('all', '');
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const orders = await prisma.salesOrderHeader.findMany({
      include: { 
        details: true,
        customer: true,
        employee: true,
        currency: true
      }
    });
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(orders));
    return orders;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.salesOrderHeader.findMany({
      include: { 
        details: true,
        customer: true,
        employee: true,
        currency: true
      }
    });
  }
};

export const getSalesOrderHeaderById = async (order_id: number) => {
  const cacheKey = getCacheKey('id', order_id);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const order = await prisma.salesOrderHeader.findUnique({
      where: { order_id },
      include: {
        details: true,
        customer: true,
        employee: true,
        currency: true
      }
    });
    if (order) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(order));
    }
    return order;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.salesOrderHeader.findUnique({
      where: { order_id },
      include: {
        details: true,
        customer: true,
        employee: true,
        currency: true
      }
    });
  }
};

export const createSalesOrderHeader = async (data: {
  order_date: Date;
  customer_id: number;
  employee_id?: string | null;
  company_id: number;
  currency_code: string;
  status: string;
  total_amount: number;
}) => {
  const order = await prisma.salesOrderHeader.create({
    data,
    include: {
      details: true,
      customer: true,
      employee: true,
      currency: true
    }
  });
  // Invalidate all orders cache since we added a new one
  await redis.del(getCacheKey('all', '')).catch(console.error);
  return order;
};

export const updateSalesOrderHeader = async (order_id: number, data: {
  status?: string;
  total_amount?: number;
  shipped_date?: Date | null;
}) => {
  const order = await prisma.salesOrderHeader.update({
    where: { order_id },
    data,
    include: {
      details: true,
      customer: true,
      employee: true,
      currency: true
    }
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('id', order_id)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return order;
};

export const deleteSalesOrderHeader = async (order_id: number) => {
  const result = await prisma.salesOrderHeader.delete({
    where: { order_id }
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('id', order_id)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return result;
};
