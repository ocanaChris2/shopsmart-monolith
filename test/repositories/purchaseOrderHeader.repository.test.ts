/**
 * @file Test suite for PurchaseOrderHeaderRepository CRUD and caching operations
 * @module test/repositories/purchaseOrderHeader.repository.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as PurchaseOrderHeaderRepository from '../../src/repositories/purchaseOrderHeader.repository'
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
  PrismaClient.prototype.purchaseOrderHeader = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
  return { PrismaClient }
})

// Mock data
const mockPurchaseOrderHeader = {
  po_number: 'PO-001',
  order_date: new Date('2025-06-08T19:52:49.668Z'),
  total_amount: 999.99,
  status: 'PENDING',
  created_at: new Date('2025-06-08T19:52:49.668Z'),
  updated_at: new Date('2025-06-08T19:52:49.668Z'),
  details: [
    {
      id: 1,
      product_code: 'PROD-001',
      quantity: 10,
      unit_price: 99.99,
      product: {
        product_code: 'PROD-001',
        name: 'Test Product'
      }
    }
  ]
}

const mockCachedPurchaseOrderHeader = {
  ...mockPurchaseOrderHeader,
  order_date: "2025-06-08T19:52:49.668Z",
  created_at: "2025-06-08T19:52:49.668Z",
  updated_at: "2025-06-08T19:52:49.668Z"
}

describe('PurchaseOrderHeaderRepository', () => {
  let redis: Redis
  let prisma: PrismaClient

  beforeEach(() => {
    redis = new Redis()
    prisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('Cache Operations', () => {
    it('should return cached headers when available', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify([{
        ...mockPurchaseOrderHeader,
        order_date: { __type: 'Date', value: mockPurchaseOrderHeader.order_date.toISOString() },
        created_at: { __type: 'Date', value: mockPurchaseOrderHeader.created_at.toISOString() },
        updated_at: { __type: 'Date', value: mockPurchaseOrderHeader.updated_at.toISOString() }
      }]))
      const result = await PurchaseOrderHeaderRepository.getAllPurchaseOrderHeaders()
      expect(result).toEqual([mockPurchaseOrderHeader])
      expect(prisma.purchaseOrderHeader.findMany).not.toHaveBeenCalled()
    })

    it('should fallback to DB when cache fails', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'))
      vi.mocked(prisma.purchaseOrderHeader.findMany).mockResolvedValue([mockPurchaseOrderHeader])
      const result = await PurchaseOrderHeaderRepository.getAllPurchaseOrderHeaders()
      expect(result).toEqual([mockPurchaseOrderHeader])
      expect(prisma.purchaseOrderHeader.findMany).toHaveBeenCalled()
    })
  })

  describe('Lookup Methods', () => {
    it('should get header by po_number', async () => {
      vi.mocked(prisma.purchaseOrderHeader.findUnique).mockResolvedValue(mockPurchaseOrderHeader)
      const result = await PurchaseOrderHeaderRepository.getPurchaseOrderHeaderById('PO-001')
      expect(result).toEqual(mockPurchaseOrderHeader)
    })
  })

  describe('CRUD Operations', () => {
    it('should create a header and invalidate cache', async () => {
      vi.mocked(prisma.purchaseOrderHeader.create).mockResolvedValue(mockPurchaseOrderHeader)
      const result = await PurchaseOrderHeaderRepository.createPurchaseOrderHeader({
        po_number: 'PO-001',
        order_date: new Date(),
        total_amount: 999.99,
        status: 'PENDING'
      })
      expect(result).toEqual(mockPurchaseOrderHeader)
      expect(redis.del).toHaveBeenCalledWith('purchaseOrderHeader:all:')
    })

    it('should update a header and invalidate caches', async () => {
      const updatedHeader = { ...mockPurchaseOrderHeader, status: 'COMPLETED' }
      vi.mocked(prisma.purchaseOrderHeader.update).mockResolvedValue(updatedHeader)
      const result = await PurchaseOrderHeaderRepository.updatePurchaseOrderHeader('PO-001', {
        status: 'COMPLETED'
      })
      expect(result).toEqual(updatedHeader)
      expect(redis.del).toHaveBeenCalledWith('purchaseOrderHeader:byId:PO-001')
      expect(redis.del).toHaveBeenCalledWith('purchaseOrderHeader:all:')
    })

    it('should delete a header and invalidate caches', async () => {
      vi.mocked(prisma.purchaseOrderHeader.delete).mockResolvedValue(mockPurchaseOrderHeader)
      const result = await PurchaseOrderHeaderRepository.deletePurchaseOrderHeader('PO-001')
      expect(result).toEqual(mockPurchaseOrderHeader)
      expect(redis.del).toHaveBeenCalledWith('purchaseOrderHeader:byId:PO-001')
      expect(redis.del).toHaveBeenCalledWith('purchaseOrderHeader:all:')
    })
  })
})
