/**
 * @file Test suite for SalesOrderDetailRepository CRUD and caching operations
 * @module test/repositories/salesOrderDetail.repository.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as SalesOrderDetailRepository from '../../src/repositories/salesOrderDetail.repository'
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
  PrismaClient.prototype.salesOrderDetail = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
  return { PrismaClient }
})

// Mock data
const mockSalesOrderDetail = {
  order_detail_id: 1,
  order_id: 1,
  product_id: 1,
  quantity: 10,
  price: 99.99,
  discount: 0.1,
  created_at: new Date('2025-06-08T19:52:49.668Z'),
  updated_at: new Date('2025-06-08T19:52:49.668Z'),
  product: {
    product_id: 1,
    name: 'Test Product'
  },
  order: {
    order_id: 1,
    customer_id: 1
  }
}

const mockCachedSalesOrderDetail = {
  ...mockSalesOrderDetail,
  created_at: "2025-06-08T19:52:49.668Z",
  updated_at: "2025-06-08T19:52:49.668Z"
}

describe('SalesOrderDetailRepository', () => {
  let redis: Redis
  let prisma: PrismaClient

  beforeEach(() => {
    redis = new Redis()
    prisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('Cache Operations', () => {
    it('should return cached details by order when available', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify([{
        ...mockSalesOrderDetail,
        created_at: { __type: 'Date', value: mockSalesOrderDetail.created_at.toISOString() },
        updated_at: { __type: 'Date', value: mockSalesOrderDetail.updated_at.toISOString() }
      }]))
      const result = await SalesOrderDetailRepository.getSalesOrderDetails(1)
      expect(result).toEqual([mockSalesOrderDetail])
      expect(prisma.salesOrderDetail.findMany).not.toHaveBeenCalled()
    })

    it('should fallback to DB when cache fails', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'))
      vi.mocked(prisma.salesOrderDetail.findMany).mockResolvedValue([mockSalesOrderDetail])
      const result = await SalesOrderDetailRepository.getSalesOrderDetails(1)
      expect(result).toEqual([mockSalesOrderDetail])
      expect(prisma.salesOrderDetail.findMany).toHaveBeenCalled()
    })
  })

  describe('Lookup Methods', () => {
    it('should get detail by id', async () => {
      vi.mocked(prisma.salesOrderDetail.findUnique).mockResolvedValue(mockSalesOrderDetail)
      const result = await SalesOrderDetailRepository.getSalesOrderDetailById(1)
      expect(result).toEqual(mockSalesOrderDetail)
    })
  })

  describe('CRUD Operations', () => {
    it('should create a detail and invalidate caches', async () => {
      vi.mocked(prisma.salesOrderDetail.create).mockResolvedValue(mockSalesOrderDetail)
      const result = await SalesOrderDetailRepository.createSalesOrderDetail({
        order_id: 1,
        product_id: 1,
        quantity: 10,
        price: 99.99
      })
      expect(result).toEqual(mockSalesOrderDetail)
      expect(redis.del).toHaveBeenCalledWith('salesOrderDetail:byOrder:1')
    })

    it('should update a detail and invalidate relevant caches', async () => {
      const existingDetail = { ...mockSalesOrderDetail }
      vi.mocked(prisma.salesOrderDetail.findUnique).mockResolvedValue(existingDetail)
      
      const updatedDetail = { ...mockSalesOrderDetail, quantity: 15 }
      vi.mocked(prisma.salesOrderDetail.update).mockResolvedValue(updatedDetail)
      
      const result = await SalesOrderDetailRepository.updateSalesOrderDetail(1, {
        quantity: 15
      })
      expect(result).toEqual(updatedDetail)
      expect(redis.del).toHaveBeenCalledWith('salesOrderDetail:byId:1')
      expect(redis.del).toHaveBeenCalledWith('salesOrderDetail:byOrder:1')
    })

    it('should delete a detail and invalidate relevant caches', async () => {
      vi.mocked(prisma.salesOrderDetail.findUnique).mockResolvedValue(mockSalesOrderDetail)
      vi.mocked(prisma.salesOrderDetail.delete).mockResolvedValue(mockSalesOrderDetail)
      
      const result = await SalesOrderDetailRepository.deleteSalesOrderDetail(1)
      expect(result).toEqual(mockSalesOrderDetail)
      expect(redis.del).toHaveBeenCalledWith('salesOrderDetail:byId:1')
      expect(redis.del).toHaveBeenCalledWith('salesOrderDetail:byOrder:1')
    })
  })
})
