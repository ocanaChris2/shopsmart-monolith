import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

const CACHE_TTL = 60 * 60; // 1 hour

function getCacheKey(method: string, identifier: string | number): string {
  return `priceListDetail:${method}:${identifier}`;
}

export const getPriceListDetails = async () => {
  const cacheKey = getCacheKey('all', '');
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const details = await prisma.priceListDetail.findMany({
      include: { 
        price_list: true,
        product: true,
        currency: true
      }
    });
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(details));
    return details;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.priceListDetail.findMany({
      include: { 
        price_list: true,
        product: true,
        currency: true
      }
    });
  }
};

export const getPriceListDetailById = async (id: number) => {
  const cacheKey = getCacheKey('byId', id);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const detail = await prisma.priceListDetail.findUnique({
      where: { id },
      include: {
        price_list: true,
        product: true,
        currency: true
      }
    });
    if (detail) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(detail));
    }
    return detail;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.priceListDetail.findUnique({
      where: { id },
      include: {
        price_list: true,
        product: true,
        currency: true
      }
    });
  }
};

export const createPriceListDetail = async (data: {
  price_list_id: number;
  product_id: number;
  price: number;
  currency_code: string;
  valid_from?: Date;
  valid_to?: Date;
}) => {
  const detail = await prisma.priceListDetail.create({
    data,
    include: {
      price_list: true,
      product: true,
      currency: true
    }
  });
  // Invalidate all details cache since we added a new one
  await redis.del(getCacheKey('all', '')).catch(console.error);
  return detail;
};

export const updatePriceListDetail = async (id: number, data: {
  price?: number;
  currency_code?: string;
  valid_from?: Date;
  valid_to?: Date | null;
}) => {
  const detail = await prisma.priceListDetail.update({
    where: { id },
    data,
    include: {
      price_list: true,
      product: true,
      currency: true
    }
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('byId', id)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return detail;
};

export const deletePriceListDetail = async (id: number) => {
  const result = await prisma.priceListDetail.delete({
    where: { id }
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('byId', id)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return result;
};
