import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

const CACHE_TTL = 60 * 60; // 1 hour

function getCacheKey(method: string, identifier: string | number): string {
  return `priceList:${method}:${identifier}`;
}

export const getAllPriceLists = async () => {
  const cacheKey = getCacheKey('all', '');
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const priceLists = await prisma.priceList.findMany({
      include: { details: true }
    });
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(priceLists));
    return priceLists;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.priceList.findMany({
      include: { details: true }
    });
  }
};

export const getPriceListById = async (id: number) => {
  const cacheKey = getCacheKey('id', id);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const priceList = await prisma.priceList.findUnique({
      where: { price_list_id: id },
      include: { details: true }
    });
    if (priceList) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(priceList));
    }
    return priceList;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.priceList.findUnique({
      where: { price_list_id: id },
      include: { details: true }
    });
  }
};

export const createPriceList = async (data: {
  name: string;
  valid_from: Date;
  valid_to?: Date;
}) => {
  const priceList = await prisma.priceList.create({ 
    data,
    include: { details: true }
  });
  // Invalidate all price lists cache since we added a new one
  await redis.del(getCacheKey('all', '')).catch(console.error);
  return priceList;
};

export const updatePriceList = async (id: number, data: {
  name?: string;
  valid_from?: Date;
  valid_to?: Date | null;
}) => {
  const priceList = await prisma.priceList.update({
    where: { price_list_id: id },
    data,
    include: { details: true }
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('id', id)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return priceList;
};

export const deletePriceList = async (id: number) => {
  const result = await prisma.priceList.delete({
    where: { price_list_id: id }
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('id', id)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return result;
};
