import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

const CACHE_TTL = 60 * 60; // 1 hour

function getCacheKey(method: string, identifier: string | number): string {
  return `salesOrderDetail:${method}:${identifier}`;
}

export const getSalesOrderDetails = async (order_id: number) => {
  const cacheKey = getCacheKey('byOrder', order_id);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const details = await prisma.salesOrderDetail.findMany({
      where: { order_id },
      include: {
        product: true,
        order: true
      }
    });
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(details));
    return details;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.salesOrderDetail.findMany({
      where: { order_id },
      include: {
        product: true,
        order: true
      }
    });
  }
};

export const getSalesOrderDetailById = async (order_detail_id: number) => {
  const cacheKey = getCacheKey('byId', order_detail_id);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const detail = await prisma.salesOrderDetail.findUnique({
      where: { order_detail_id },
      include: {
        product: true,
        order: true
      }
    });
    if (detail) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(detail));
    }
    return detail;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.salesOrderDetail.findUnique({
      where: { order_detail_id },
      include: {
        product: true,
        order: true
      }
    });
  }
};

export const createSalesOrderDetail = async (data: {
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  discount?: number;
}) => {
  const detail = await prisma.salesOrderDetail.create({
    data,
    include: {
      product: true,
      order: true
    }
  });
  // Invalidate relevant caches
  await Promise.all([
    redis.del(getCacheKey('byOrder', data.order_id)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return detail;
};

export const updateSalesOrderDetail = async (order_detail_id: number, data: {
  quantity?: number;
  price?: number;
  discount?: number;
}) => {
  // Get existing detail to get order_id for cache invalidation
  const existing = await prisma.salesOrderDetail.findUnique({
    where: { order_detail_id }
  });
  
  const detail = await prisma.salesOrderDetail.update({
    where: { order_detail_id },
    data,
    include: {
      product: true,
      order: true
    }
  });
  
  // Invalidate relevant caches
  await Promise.all([
    redis.del(getCacheKey('byId', order_detail_id)),
    existing ? redis.del(getCacheKey('byOrder', existing.order_id)) : Promise.resolve()
  ]).catch(console.error);
  
  return detail;
};

export const deleteSalesOrderDetail = async (order_detail_id: number) => {
  // Get existing detail to get order_id for cache invalidation
  const existing = await prisma.salesOrderDetail.findUnique({
    where: { order_detail_id }
  });
  
  const result = await prisma.salesOrderDetail.delete({
    where: { order_detail_id }
  });
  
  // Invalidate relevant caches
  await Promise.all([
    redis.del(getCacheKey('byId', order_detail_id)),
    existing ? redis.del(getCacheKey('byOrder', existing.order_id)) : Promise.resolve()
  ]).catch(console.error);
  
  return result;
};
