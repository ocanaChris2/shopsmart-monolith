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
  return `product:${method}:${identifier}`;
}

export const getAllProducts = async () => {
  const cacheKey = getCacheKey('all', '');
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return parseWithDates(cached);
    
    const products = await prisma.product.findMany();
    await redis.setex(cacheKey, CACHE_TTL, stringifyWithDates(products));
    return products;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.product.findMany();
  }
};

export const getProductById = async (id: number) => {
  const cacheKey = getCacheKey('id', id);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return parseWithDates(cached);
    
    const product = await prisma.product.findUnique({
      where: { product_id: id }
    });
    if (product) {
      await redis.setex(cacheKey, CACHE_TTL, stringifyWithDates(product));
    }
    return product;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.product.findUnique({
      where: { product_id: id }
    });
  }
};

export const getProductByCode = async (code: string) => {
  const cacheKey = getCacheKey('code', code);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return parseWithDates(cached);
    
    const product = await prisma.product.findUnique({
      where: { product_code: code }
    });
    if (product) {
      await redis.setex(cacheKey, CACHE_TTL, stringifyWithDates(product));
    }
    return product;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.product.findUnique({
      where: { product_code: code }
    });
  }
};

export const createProduct = async (data: {
  product_code: string;
  name: string;
  description?: string;
  price?: number;
}) => {
  const product = await prisma.product.create({ data });
  // Invalidate all products cache since we added a new one
  await redis.del(getCacheKey('all', '')).catch(console.error);
  return product;
};

export const updateProduct = async (id: number, data: {
  product_code?: string;
  name?: string;
  description?: string;
  price?: number;
}) => {
  const product = await prisma.product.update({
    where: { product_id: id },
    data
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('id', id)),
    redis.del(getCacheKey('code', product.product_code)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return product;
};

export const deleteProduct = async (id: number) => {
  // Get product first to know its code for cache invalidation
  const product = await prisma.product.findUnique({
    where: { product_id: id }
  });
  if (!product) return null;

  const result = await prisma.product.delete({
    where: { product_id: id }
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('id', id)),
    redis.del(getCacheKey('code', product.product_code)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return result;
};
