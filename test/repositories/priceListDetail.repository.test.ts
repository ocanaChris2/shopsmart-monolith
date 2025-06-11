/**
 * @file Test suite for PriceListDetailRepository CRUD and caching operations
 * @module test/repositories/priceListDetail.repository.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as PriceListDetailRepository from '../../src/repositories/priceListDetail.repository'
import Redis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { stringifyWithDates } from '../../src/utils/dateUtils'

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
  PrismaClient.prototype.priceListDetail = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
  return { PrismaClient }
})

// Mock data
const mockPriceListDetail = {
  id: 1,
  price_list_id: 1,
  product_id: 1,
  price: 99.99,
  currency_code: 'USD',
  valid_from: new Date('2025-06-08T19:52:49.667Z'),
  valid_to: new Date('2025-06-09T19:52:49.667Z'),
  createdAt: new Date('2025-06-08T19:52:49.667Z'),
  updatedAt: new Date('2025-06-08T19:52:49.667Z'),
  price_list: {
    price_list_id: 1,
    name: 'Standard Pricing'
  },
  product: {
    product_id: 1,
    name: 'Test Product'
  },
  currency: {
    currency_code: 'USD',
    name: 'US Dollar'
  }
}

const mockCachedPriceListDetail = {
  ...mockPriceListDetail,
  valid_from: "2025-06-08T19:52:49.667Z",
  valid_to: "2025-06-09T19:52:49.667Z",
  createdAt: "2025-06-08T19:52:49.667Z",
  updatedAt: "2025-06-08T19:52:49.667Z"
}

describe('PriceListDetailRepository', () => {
  let redis: Redis
  let prisma: PrismaClient

  beforeEach(() => {
    redis = new Redis()
    prisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('Cache Operations', () => {
    it('should return cached price list details when available', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify([{
        ...mockPriceListDetail,
        valid_from: { __type: 'Date', value: mockPriceListDetail.valid_from.toISOString() },
        valid_to: { __type: 'Date', value: mockPriceListDetail.valid_to.toISOString() },
        createdAt: { __type: 'Date', value: mockPriceListDetail.createdAt.toISOString() },
        updatedAt: { __type: 'Date', value: mockPriceListDetail.updatedAt.toISOString() }
      }]))
      const result = await PriceListDetailRepository.getPriceListDetails()
      expect(result).toEqual([mockPriceListDetail])
      expect(prisma.priceListDetail.findMany).not.toHaveBeenCalled()
    })

    it('should fallback to DB when cache fails', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'))
      vi.mocked(prisma.priceListDetail.findMany).mockResolvedValue([mockPriceListDetail])
      const result = await PriceListDetailRepository.getPriceListDetails()
      expect(result).toEqual([mockPriceListDetail])
      expect(prisma.priceListDetail.findMany).toHaveBeenCalled()
    })
  })

  describe('CRUD Operations', () => {
    it('should get price list detail by id', async () => {
      vi.mocked(prisma.priceListDetail.findUnique).mockResolvedValue(mockPriceListDetail)
      const result = await PriceListDetailRepository.getPriceListDetailById(1)
      expect(result).toEqual(mockPriceListDetail)
    })

    it('should create a price list detail and invalidate cache', async () => {
      vi.mocked(prisma.priceListDetail.create).mockResolvedValue(mockPriceListDetail)
      const result = await PriceListDetailRepository.createPriceListDetail({
        price_list_id: 1,
        product_id: 1,
        price: 99.99,
        currency_code: 'USD'
      })
      expect(result).toEqual(mockPriceListDetail)
      expect(redis.del).toHaveBeenCalledWith('priceListDetail:all:')
    })

    it('should update a price list detail and invalidate caches', async () => {
      vi.mocked(prisma.priceListDetail.update).mockResolvedValue(mockPriceListDetail)
      const result = await PriceListDetailRepository.updatePriceListDetail(1, {
        price: 109.99
      })
      expect(result).toEqual(mockPriceListDetail)
      expect(redis.del).toHaveBeenCalledWith('priceListDetail:byId:1')
      expect(redis.del).toHaveBeenCalledWith('priceListDetail:all:')
    })

    it('should delete a price list detail and invalidate caches', async () => {
      vi.mocked(prisma.priceListDetail.delete).mockResolvedValue(mockPriceListDetail)
      const result = await PriceListDetailRepository.deletePriceListDetail(1)
      expect(result).toEqual(mockPriceListDetail)
      expect(redis.del).toHaveBeenCalledWith('priceListDetail:byId:1')
      expect(redis.del).toHaveBeenCalledWith('priceListDetail:all:')
    })
  })
})
