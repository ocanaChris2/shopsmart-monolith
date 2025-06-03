import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

const CACHE_TTL = 60 * 60; // 1 hour

function getCacheKey(method: string, identifier: string | number): string {
  return `currency:${method}:${identifier}`;
}

export const getAllCurrencies = async () => {
  const cacheKey = getCacheKey('all', '');
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const currencies = await prisma.currency.findMany();
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(currencies));
    return currencies;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.currency.findMany();
  }
};

export const getCurrencyByCode = async (code: string) => {
  const cacheKey = getCacheKey('code', code);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const currency = await prisma.currency.findUnique({
      where: { currency_code: code }
    });
    if (currency) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(currency));
    }
    return currency;
  } catch (err) {
    console.error('Redis error, falling back to DB', err);
    return await prisma.currency.findUnique({
      where: { currency_code: code }
    });
  }
};

export const createCurrency = async (data: {
  currency_code: string;
  name: string;
  symbol?: string;
}) => {
  const currency = await prisma.currency.create({ data });
  // Invalidate all currencies cache since we added a new one
  await redis.del(getCacheKey('all', '')).catch(console.error);
  return currency;
};

export const updateCurrency = async (code: string, data: {
  name?: string;
  symbol?: string;
}) => {
  const currency = await prisma.currency.update({
    where: { currency_code: code },
    data
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('code', code)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return currency;
};

export const deleteCurrency = async (code: string) => {
  const result = await prisma.currency.delete({
    where: { currency_code: code }
  });
  // Invalidate all relevant caches
  await Promise.all([
    redis.del(getCacheKey('code', code)),
    redis.del(getCacheKey('all', ''))
  ]).catch(console.error);
  return result;
};
