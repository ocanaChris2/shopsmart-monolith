/**
 * @file Test suite for PriceListDetailService CRUD operations
 * @module test/services/priceListDetail.service.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as PriceListDetailService from '../../src/services/priceListDetail.service'
import * as PriceListDetailRepository from '../../src/repositories/priceListDetail.repository'
import { PriceListDetail } from '@prisma/client'

// Mock repository functions
vi.mock('../../src/repositories/priceListDetail.repository', () => ({
  getPriceListDetails: vi.fn(),
  getPriceListDetailById: vi.fn(),
  createPriceListDetail: vi.fn(),
  updatePriceListDetail: vi.fn(),
  deletePriceListDetail: vi.fn()
}))

// Mock data
const mockDetail = {
  id: 1,
  price_list_id: 1,
  product_id: 1,
  price: 100,
  currency_code: 'USD',
  valid_from: new Date(),
  valid_to: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  price_list: {
    price_list_id: 1,
    name: 'Test Price List',
    valid_from: new Date(),
    valid_to: null
  },
  product: {
    product_id: 1,
    name: 'Test Product',
    product_code: 'TP001',
    price: null,
    description: null,
    created_at: new Date()
  },
  currency: {
    currency_code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimal_places: 2
  }
}

// Setup mock implementations
beforeEach(() => {
  vi.mocked(PriceListDetailRepository.getPriceListDetails).mockResolvedValue([mockDetail])
  vi.mocked(PriceListDetailRepository.getPriceListDetailById).mockResolvedValue(mockDetail)
  vi.mocked(PriceListDetailRepository.createPriceListDetail).mockResolvedValue(mockDetail)
  vi.mocked(PriceListDetailRepository.updatePriceListDetail).mockResolvedValue({
    ...mockDetail,
    price: 150
  })
  vi.mocked(PriceListDetailRepository.deletePriceListDetail).mockResolvedValue(mockDetail)
})

describe('PriceListDetailService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create Operations', () => {
    it('should create a new price list detail', async () => {
      const detail = await PriceListDetailService.createPriceListDetail({
        price_list_id: 1,
        product_id: 1,
        price: 100,
        currency_code: 'USD'
      })
      
      expect(detail).toEqual(mockDetail)
      expect(PriceListDetailRepository.createPriceListDetail).toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      await expect(PriceListDetailService.createPriceListDetail({
        price_list_id: 0,
        product_id: 0,
        price: -1,
        currency_code: 'US'
      })).rejects.toThrow()
    })
  })

  describe('Read Operations', () => {
    it('should get price list detail by ID', async () => {
      const detail = await PriceListDetailService.getPriceListDetail('1')
      expect(detail).toEqual(mockDetail)
      expect(PriceListDetailRepository.getPriceListDetailById).toHaveBeenCalledWith(1)
    })

    it('should get all price list details', async () => {
      const details = await PriceListDetailService.getPriceListDetails()
      expect(details).toEqual([mockDetail])
      expect(PriceListDetailRepository.getPriceListDetails).toHaveBeenCalled()
    })

    it('should throw when detail not found', async () => {
      vi.mocked(PriceListDetailRepository.getPriceListDetailById).mockResolvedValue(null)
      await expect(PriceListDetailService.getPriceListDetail('999')).rejects.toThrow('PriceListDetail not found')
    })
  })

  describe('Update Operations', () => {
    it('should update price list detail', async () => {
      const updated = await PriceListDetailService.updatePriceListDetail('1', {
        price: 150
      })
      
      expect(updated.price).toBe(150)
      expect(PriceListDetailRepository.updatePriceListDetail).toHaveBeenCalledWith(1, {
        price: 150
      })
    })

    it('should validate update data', async () => {
      await expect(PriceListDetailService.updatePriceListDetail('1', {
        price: -1
      })).rejects.toThrow()
    })
  })

  describe('Delete Operations', () => {
    it('should delete a price list detail', async () => {
      const deleted = await PriceListDetailService.deletePriceListDetail('1')
      expect(deleted).toEqual(mockDetail)
      expect(PriceListDetailRepository.deletePriceListDetail).toHaveBeenCalledWith(1)
    })

    it('should throw when deleting non-existent detail', async () => {
      vi.mocked(PriceListDetailRepository.getPriceListDetailById).mockResolvedValue(null)
      await expect(PriceListDetailService.deletePriceListDetail('999')).rejects.toThrow('PriceListDetail not found')
    })
  })
})