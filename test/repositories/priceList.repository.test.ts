/**
 * @file Test suite for PriceListRepository CRUD and caching operations
 * @module test/repositories/priceList.repository.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as PriceListRepository from '../../src/repositories/priceList.repository'
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
  PrismaClient.prototype.priceList = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
  return { PrismaClient }
})

// Mock data
const mockPriceList = {
  price_list_id: 1,
  name: 'Standard Pricing',
  valid_from: new Date('2025-06-08T19:52:49.954Z'),
  valid_to: new Date('2025-06-09T19:52:49.954Z'),
  createdAt: new Date('2025-06-08T19:52:49.954Z'),
  updatedAt: new Date('2025-06-08T19:52:49.954Z'),
  details: []
}

const mockCachedPriceList = {
  ...mockPriceList,
  valid_from: "2025-06-08T19:52:49.954Z",
  valid_to: "2025-06-09T19:52:49.954Z",
  createdAt: "2025-06-08T19:52:49.954Z",
  updatedAt: "2025-06-08T19:52:49.954Z"
}

describe('PriceListRepository', () => {
  let redis: Redis
  let prisma: PrismaClient

  beforeEach(() => {
    redis = new Redis()
    prisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('Cache Operations', () => {
    it('should return cached price lists when available', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify([{
        ...mockPriceList,
        valid_from: { __type: 'Date', value: mockPriceList.valid_from.toISOString() },
        valid_to: { __type: 'Date', value: mockPriceList.valid_to.toISOString() },
        createdAt: { __type: 'Date', value: mockPriceList.createdAt.toISOString() },
        updatedAt: { __type: 'Date', value: mockPriceList.updatedAt.toISOString() }
      }]))
      const result = await PriceListRepository.getAllPriceLists()
      expect(result).toEqual([mockPriceList])
      expect(prisma.priceList.findMany).not.toHaveBeenCalled()
    })

    it('should fallback to DB when cache fails', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'))
      vi.mocked(prisma.priceList.findMany).mockResolvedValue([mockPriceList])
      const result = await PriceListRepository.getAllPriceLists()
      expect(result).toEqual([mockPriceList])
      expect(prisma.priceList.findMany).toHaveBeenCalled()
    })
  })

  describe('CRUD Operations', () => {
    it('should get price list by id', async () => {
      vi.mocked(prisma.priceList.findUnique).mockResolvedValue(mockPriceList)
      const result = await PriceListRepository.getPriceListById(1)
      expect(result).toEqual(mockPriceList)
    })

    it('should create a price list and invalidate cache', async () => {
      vi.mocked(prisma.priceList.create).mockResolvedValue(mockPriceList)
      const result = await PriceListRepository.createPriceList({
        name: 'Standard Pricing',
        valid_from: new Date()
      })
      expect(result).toEqual(mockPriceList)
      expect(redis.del).toHaveBeenCalledWith('priceList:all:')
    })

    it('should update a price list and invalidate caches', async () => {
      vi.mocked(prisma.priceList.update).mockResolvedValue(mockPriceList)
      const result = await PriceListRepository.updatePriceList(1, {
        name: 'Updated Pricing'
      })
      expect(result).toEqual(mockPriceList)
      expect(redis.del).toHaveBeenCalledWith('priceList:id:1')
      expect(redis.del).toHaveBeenCalledWith('priceList:all:')
    })

    it('should delete a price list and invalidate caches', async () => {
      vi.mocked(prisma.priceList.delete).mockResolvedValue(mockPriceList)
      const result = await PriceListRepository.deletePriceList(1)
      expect(result).toEqual(mockPriceList)
      expect(redis.del).toHaveBeenCalledWith('priceList:id:1')
      expect(redis.del).toHaveBeenCalledWith('priceList:all:')
    })
  })
})
