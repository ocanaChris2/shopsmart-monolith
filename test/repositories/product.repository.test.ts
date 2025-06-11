/**
 * @file Test suite for ProductRepository CRUD and caching operations
 * @module test/repositories/product.repository.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as ProductRepository from '../../src/repositories/product.repository'
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
  PrismaClient.prototype.product = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
  return { PrismaClient }
})

// Mock data
const mockProduct = {
  product_id: 1,
  product_code: 'PROD-001',
  name: 'Test Product',
  description: null,
  price: null,
  created_at: new Date('2025-06-08T19:52:49.668Z')
}

const mockCachedProduct = {
  ...mockProduct,
  created_at: "2025-06-08T19:52:49.668Z"
}

describe('ProductRepository', () => {
  let redis: Redis
  let prisma: PrismaClient

  beforeEach(() => {
    redis = new Redis()
    prisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('Cache Operations', () => {
    it('should return cached products when available', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify([{
        ...mockProduct,
        created_at: { __type: 'Date', value: mockProduct.created_at.toISOString() }
      }]))
      const result = await ProductRepository.getAllProducts()
      expect(result).toEqual([mockProduct])
      expect(prisma.product.findMany).not.toHaveBeenCalled()
    })

    it('should fallback to DB when cache fails', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'))
      vi.mocked(prisma.product.findMany).mockResolvedValue([mockProduct])
      const result = await ProductRepository.getAllProducts()
      expect(result).toEqual([mockProduct])
      expect(prisma.product.findMany).toHaveBeenCalled()
    })
  })

  describe('Lookup Methods', () => {
    it('should get product by id', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct)
      const result = await ProductRepository.getProductById(1)
      expect(result).toEqual(mockProduct)
    })

    it('should get product by code', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct)
      const result = await ProductRepository.getProductByCode('PROD-001')
      expect(result).toEqual(mockProduct)
    })
  })

  describe('CRUD Operations', () => {
    it('should create a product and invalidate cache', async () => {
      vi.mocked(prisma.product.create).mockResolvedValue(mockProduct)
      const result = await ProductRepository.createProduct({
        product_code: 'PROD-001',
        name: 'Test Product'
      })
      expect(result).toEqual(mockProduct)
      expect(redis.del).toHaveBeenCalledWith('product:all:')
    })

    it('should update a product and invalidate all relevant caches', async () => {
      const updatedProduct = { ...mockProduct, name: 'Updated Product' }
      vi.mocked(prisma.product.update).mockResolvedValue(updatedProduct)
      const result = await ProductRepository.updateProduct(1, {
        name: 'Updated Product'
      })
      expect(result).toEqual(updatedProduct)
      expect(redis.del).toHaveBeenCalledWith('product:id:1')
      expect(redis.del).toHaveBeenCalledWith('product:code:PROD-001')
      expect(redis.del).toHaveBeenCalledWith('product:all:')
    })

    it('should delete a product and invalidate all relevant caches', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct)
      vi.mocked(prisma.product.delete).mockResolvedValue(mockProduct)
      const result = await ProductRepository.deleteProduct(1)
      expect(result).toEqual(mockProduct)
      expect(redis.del).toHaveBeenCalledWith('product:id:1')
      expect(redis.del).toHaveBeenCalledWith('product:code:PROD-001')
      expect(redis.del).toHaveBeenCalledWith('product:all:')
    })
  })
})
