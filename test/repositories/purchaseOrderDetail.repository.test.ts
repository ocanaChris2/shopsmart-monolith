/**
 * @file Test suite for PurchaseOrderDetailRepository CRUD and caching operations
 * @module test/repositories/purchaseOrderDetail.repository.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as PurchaseOrderDetailRepository from '../../src/repositories/purchaseOrderDetail.repository'
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
  PrismaClient.prototype.purchaseOrderDetail = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
  return { PrismaClient }
})

// Mock data
const mockPurchaseOrderDetail = {
  id: 1,
  po_number: 'PO-001',
  product_code: 'PROD-001',
  quantity: 10,
  unit_price: 99.99,
  createdAt: new Date('2025-06-08T19:52:49.665Z'),
  updatedAt: new Date('2025-06-08T19:52:49.665Z'),
  product: {
    product_code: 'PROD-001',
    name: 'Test Product'
  },
  header: {
    po_number: 'PO-001',
    supplier_id: 'SUP-001'
  }
}

const mockCachedPurchaseOrderDetail = {
  ...mockPurchaseOrderDetail,
  createdAt: "2025-06-08T19:52:49.665Z",
  updatedAt: "2025-06-08T19:52:49.665Z"
}

describe('PurchaseOrderDetailRepository', () => {
  let redis: Redis
  let prisma: PrismaClient

  beforeEach(() => {
    redis = new Redis()
    prisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('Cache Operations', () => {
    it('should return cached details by PO number when available', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify([{
        ...mockPurchaseOrderDetail,
        createdAt: { __type: 'Date', value: mockPurchaseOrderDetail.createdAt.toISOString() },
        updatedAt: { __type: 'Date', value: mockPurchaseOrderDetail.updatedAt.toISOString() }
      }]))
      const result = await PurchaseOrderDetailRepository.getPurchaseOrderDetails('PO-001')
      expect(result).toEqual([mockPurchaseOrderDetail])
      expect(prisma.purchaseOrderDetail.findMany).not.toHaveBeenCalled()
    })

    it('should fallback to DB when cache fails', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'))
      vi.mocked(prisma.purchaseOrderDetail.findMany).mockResolvedValue([mockPurchaseOrderDetail])
      const result = await PurchaseOrderDetailRepository.getPurchaseOrderDetails('PO-001')
      expect(result).toEqual([mockPurchaseOrderDetail])
      expect(prisma.purchaseOrderDetail.findMany).toHaveBeenCalled()
    })
  })

  describe('Lookup Methods', () => {
    it('should get detail by id', async () => {
      vi.mocked(prisma.purchaseOrderDetail.findUnique).mockResolvedValue(mockPurchaseOrderDetail)
      const result = await PurchaseOrderDetailRepository.getPurchaseOrderDetailById(1)
      expect(result).toEqual(mockPurchaseOrderDetail)
    })
  })

  describe('CRUD Operations', () => {
    it('should create a detail and invalidate caches', async () => {
      vi.mocked(prisma.purchaseOrderDetail.create).mockResolvedValue(mockPurchaseOrderDetail)
      const result = await PurchaseOrderDetailRepository.createPurchaseOrderDetail({
        po_number: 'PO-001',
        product_code: 'PROD-001',
        quantity: 10,
        unit_price: 99.99
      })
      expect(result).toEqual(mockPurchaseOrderDetail)
      expect(redis.del).toHaveBeenCalledWith('purchaseOrderDetail:byPoNumber:PO-001')
    })

    it('should update a detail and invalidate relevant caches', async () => {
      const existingDetail = { ...mockPurchaseOrderDetail }
      vi.mocked(prisma.purchaseOrderDetail.findUnique).mockResolvedValue(existingDetail)
      
      const updatedDetail = { ...mockPurchaseOrderDetail, quantity: 15 }
      vi.mocked(prisma.purchaseOrderDetail.update).mockResolvedValue(updatedDetail)
      
      const result = await PurchaseOrderDetailRepository.updatePurchaseOrderDetail(1, {
        quantity: 15
      })
      expect(result).toEqual(updatedDetail)
      expect(redis.del).toHaveBeenCalledWith('purchaseOrderDetail:byId:1')
      expect(redis.del).toHaveBeenCalledWith('purchaseOrderDetail:byPoNumber:PO-001')
    })

    it('should delete a detail and invalidate relevant caches', async () => {
      vi.mocked(prisma.purchaseOrderDetail.findUnique).mockResolvedValue(mockPurchaseOrderDetail)
      vi.mocked(prisma.purchaseOrderDetail.delete).mockResolvedValue(mockPurchaseOrderDetail)
      
      const result = await PurchaseOrderDetailRepository.deletePurchaseOrderDetail(1)
      expect(result).toEqual(mockPurchaseOrderDetail)
      expect(redis.del).toHaveBeenCalledWith('purchaseOrderDetail:byId:1')
      expect(redis.del).toHaveBeenCalledWith('purchaseOrderDetail:byPoNumber:PO-001')
    })
  })
})
