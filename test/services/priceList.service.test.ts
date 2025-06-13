/**
 * @file Test suite for PriceListService CRUD operations
 * @module test/services/priceList.service.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as PriceListService from '../../src/services/priceList.service'
import * as PriceListRepository from '../../src/repositories/priceList.repository'
import { PriceList } from '@prisma/client'

// Mock repository functions
vi.mock('../../src/repositories/priceList.repository', () => ({
  getAllPriceLists: vi.fn(),
  getPriceListById: vi.fn(),
  createPriceList: vi.fn(),
  updatePriceList: vi.fn(),
  deletePriceList: vi.fn()
}))

// Mock data
const mockPriceList = {
  price_list_id: 1,
  name: 'Test Price List',
  valid_from: new Date(),
  valid_to: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  details: [{
    id: 1,
    price_list_id: 1,
    product_id: 1,
    price: 100,
    currency_code: 'USD',
    valid_from: new Date(),
    valid_to: null
  }]
}

// Setup mock implementations
beforeEach(() => {
  vi.mocked(PriceListRepository.getAllPriceLists).mockResolvedValue([mockPriceList])
  vi.mocked(PriceListRepository.getPriceListById).mockResolvedValue(mockPriceList)
  vi.mocked(PriceListRepository.createPriceList).mockResolvedValue(mockPriceList)
  vi.mocked(PriceListRepository.updatePriceList).mockResolvedValue({
    ...mockPriceList,
    name: 'Updated Price List'
  })
  vi.mocked(PriceListRepository.deletePriceList).mockResolvedValue(mockPriceList)
})

describe('PriceListService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create Operations', () => {
    it('should create a new price list', async () => {
      const priceList = await PriceListService.createPriceList({
        name: 'Test Price List',
        valid_from: new Date()
      })
      
      expect(priceList).toEqual(mockPriceList)
      expect(PriceListRepository.createPriceList).toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      await expect(PriceListService.createPriceList({
        name: '',
        valid_from: new Date()
      })).rejects.toThrow()

      await expect(PriceListService.createPriceList({
        name: 'Test',
        valid_from: 'invalid-date'
      })).rejects.toThrow()
    })
  })

  describe('Read Operations', () => {
    it('should get price list by ID', async () => {
      const priceList = await PriceListService.getPriceList('1')
      expect(priceList).toEqual(mockPriceList)
      expect(PriceListRepository.getPriceListById).toHaveBeenCalledWith(1)
    })

    it('should get all price lists', async () => {
      const priceLists = await PriceListService.getAllPriceLists()
      expect(priceLists).toEqual([mockPriceList])
      expect(PriceListRepository.getAllPriceLists).toHaveBeenCalled()
    })

    it('should throw when price list not found', async () => {
      vi.mocked(PriceListRepository.getPriceListById).mockResolvedValue(null)
      await expect(PriceListService.getPriceList('999')).rejects.toThrow('PriceList not found')
    })
  })

  describe('Update Operations', () => {
    it('should update price list details', async () => {
      const updated = await PriceListService.updatePriceList('1', {
        name: 'Updated Price List'
      })
      
      expect(updated.name).toBe('Updated Price List')
      expect(PriceListRepository.updatePriceList).toHaveBeenCalledWith(1, {
        name: 'Updated Price List'
      })
    })

    it('should validate update data', async () => {
      await expect(PriceListService.updatePriceList('1', {
        name: ''
      })).rejects.toThrow()
    })
  })

  describe('Delete Operations', () => {
    it('should delete a price list', async () => {
      const deleted = await PriceListService.deletePriceList('1')
      expect(deleted).toEqual(mockPriceList)
      expect(PriceListRepository.deletePriceList).toHaveBeenCalledWith(1)
    })

    it('should throw when deleting non-existent price list', async () => {
      vi.mocked(PriceListRepository.getPriceListById).mockResolvedValue(null)
      await expect(PriceListService.deletePriceList('999')).rejects.toThrow('PriceList not found')
    })
  })
})