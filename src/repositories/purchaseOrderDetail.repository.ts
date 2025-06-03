import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

const CACHE_TTL = 60 * 60; // 1 hour

function getCacheKey(method: string, identifier: string | number): string {
  return `purchaseOrderDetail:${method}:${identifier}`;
}

export const getPurchaseOrderDetails = async (po_number: string) => {
  const cacheKey = getCacheKey('byPoNumber', po_number);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const details = await prisma.purchaseOrderDetail.findMany({
      where: { po_number },
      include: {
        product: true,
        header: true
      }
    });
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(details));
    return details;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.purchaseOrderDetail.findMany({
      where: { po_number },
      include: {
        product: true,
        header: true
      }
    });
  }
};

export const getPurchaseOrderDetailById = async (id: number) => {
  const cacheKey = getCacheKey('byId', id);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const detail = await prisma.purchaseOrderDetail.findUnique({
      where: { id },
      include: {
        product: true,
        header: true
      }
    });
    if (detail) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(detail));
    }
    return detail;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.purchaseOrderDetail.findUnique({
      where: { id },
      include: {
        product: true,
        header: true
      }
    });
  }
};

export const createPurchaseOrderDetail = async (data: {
  po_number: string;
  product_code: string;
  quantity: number;
  unit_price: number;
}) => {
  const detail = await prisma.purchaseOrderDetail.create({
    data,
    include: {
      product: true,
      header: true
    }
  });
  // Invalidate relevant caches
  await Promise.all([
    redis.del(getCacheKey('byPoNumber', data.po_number)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return detail;
};

export const updatePurchaseOrderDetail = async (id: number, data: {
  quantity?: number;
  unit_price?: number;
}) => {
  // Get existing detail to get po_number for cache invalidation
  const existing = await prisma.purchaseOrderDetail.findUnique({
    where: { id }
  });
  
  const detail = await prisma.purchaseOrderDetail.update({
    where: { id },
    data,
    include: {
      product: true,
      header: true
    }
  });
  
  // Invalidate relevant caches
  await Promise.all([
    redis.del(getCacheKey('byId', id)),
    existing ? redis.del(getCacheKey('byPoNumber', existing.po_number)) : Promise.resolve()
  ]).catch(console.error);
  
  return detail;
};

export const deletePurchaseOrderDetail = async (id: number) => {
  // Get existing detail to get po_number for cache invalidation
  const existing = await prisma.purchaseOrderDetail.findUnique({
    where: { id }
  });
  
  const result = await prisma.purchaseOrderDetail.delete({
    where: { id }
  });
  
  // Invalidate relevant caches
  await Promise.all([
    redis.del(getCacheKey('byId', id)),
    existing ? redis.del(getCacheKey('byPoNumber', existing.po_number)) : Promise.resolve()
  ]).catch(console.error);
  
  return result;
};
