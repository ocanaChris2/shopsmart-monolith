/**
 * @file Test suite for CurrencyRepository CRUD and caching operations
 * @module test/repositories/currency.repository.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as CurrencyRepository from '../../src/repositories/currency.repository'
import Redis from 'ioredis'
import { PrismaClient } from '@prisma/client'

// Mock Redis and Prisma
vi.mock('ioredis', () => {
  const Redis = vi.fn()
  Redis.prototype.get = vi.fn()
  Redis.prototype.setex = vi.fn()
  Redis.prototype.del = vi.fn().mockResolvedValue(1)
  return { default: Redis }
})

vi.mock('@prisma/client', () => {
  const PrismaClient = vi.fn()
  PrismaClient.prototype.currency = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
  return { PrismaClient }
})

// Mock data
const mockCurrency = {
  currency_code: 'USD',
  name: 'US Dollar',
  symbol: '$',
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('CurrencyRepository', () => {
  let redis: Redis
  let prisma: PrismaClient

  beforeEach(() => {
    redis = new Redis()
    prisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('getAllCurrencies', () => {
    it('should return cached currencies when available', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify([mockCurrency]))
      const result = await CurrencyRepository.getAllCurrencies()
      expect(result).toEqual([mockCurrency])
      expect(prisma.currency.findMany).not.toHaveBeenCalled()
    })

    it('should fetch from DB and cache when no cache exists', async () => {
      vi.mocked(redis.get).mockResolvedValue(null)
      vi.mocked(prisma.currency.findMany).mockResolvedValue([mockCurrency])
      const result = await CurrencyRepository.getAllCurrencies()
      expect(result).toEqual([mockCurrency])
      expect(redis.setex).toHaveBeenCalledWith(
        'currency:all:',
        3600,
        JSON.stringify([mockCurrency])
      )
    })

    it('should fall back to DB on Redis error', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'))
      vi.mocked(prisma.currency.findMany).mockResolvedValue([mockCurrency])
      const result = await CurrencyRepository.getAllCurrencies()
      expect(result).toEqual([mockCurrency])
    })
  })

  describe('getCurrencyByCode', () => {
    it('should return cached currency when available', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockCurrency))
      const result = await CurrencyRepository.getCurrencyByCode('USD')
      expect(result).toEqual(mockCurrency)
      expect(redis.get).toHaveBeenCalledWith('currency:code:USD')
      expect(prisma.currency.findUnique).not.toHaveBeenCalled()
    })

    it('should fetch from DB and cache when no cache exists', async () => {
      vi.mocked(redis.get).mockResolvedValue(null)
      vi.mocked(prisma.currency.findUnique).mockResolvedValue(mockCurrency)
      const result = await CurrencyRepository.getCurrencyByCode('USD')
      expect(result).toEqual(mockCurrency)
      expect(redis.setex).toHaveBeenCalledWith(
        'currency:code:USD',
        3600,
        JSON.stringify(mockCurrency)
      )
    })

    it('should return null for non-existent currency', async () => {
      vi.mocked(redis.get).mockResolvedValue(null)
      vi.mocked(prisma.currency.findUnique).mockResolvedValue(null)
      const result = await CurrencyRepository.getCurrencyByCode('XXX')
      expect(result).toBeNull()
    })
  })

  describe('createCurrency', () => {
    it('should create currency and invalidate cache', async () => {
      vi.mocked(prisma.currency.create).mockResolvedValue(mockCurrency)
      const result = await CurrencyRepository.createCurrency({
        currency_code: 'USD',
        name: 'US Dollar'
      })
      expect(result).toEqual(mockCurrency)
      expect(redis.del).toHaveBeenCalledWith('currency:all:')
    })
  })

  describe('updateCurrency', () => {
    it('should update currency and invalidate caches', async () => {
      vi.mocked(prisma.currency.update).mockResolvedValue(mockCurrency)
      const result = await CurrencyRepository.updateCurrency('USD', {
        name: 'US Dollar Updated'
      })
      expect(result).toEqual(mockCurrency)
      expect(redis.del).toHaveBeenCalledWith('currency:code:USD')
      expect(redis.del).toHaveBeenCalledWith('currency:all:')
    })
  })

  describe('deleteCurrency', () => {
    it('should delete currency and invalidate caches', async () => {
      vi.mocked(prisma.currency.delete).mockResolvedValue(mockCurrency)
      const result = await CurrencyRepository.deleteCurrency('USD')
      expect(result).toEqual(mockCurrency)
      expect(redis.del).toHaveBeenCalledWith('currency:code:USD')
      expect(redis.del).toHaveBeenCalledWith('currency:all:')
    })
  })
})
