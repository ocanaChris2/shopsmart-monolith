/**
 * @file Test suite for CurrencyService CRUD operations
 * @module test/services/currency.service.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as CurrencyService from '../../src/services/currency.service'
import * as CurrencyRepository from '../../src/repositories/currency.repository'
import { z } from 'zod'
import { NotFoundError } from '../../src/errors'

// Mock repository functions
vi.mock('../../src/repositories/currency.repository', () => ({
  getAllCurrencies: vi.fn(),
  getCurrencyByCode: vi.fn(),
  createCurrency: vi.fn(),
  updateCurrency: vi.fn(),
  deleteCurrency: vi.fn()
}))

// Mock data
const mockCurrency = {
  currency_code: 'USD',
  name: 'US Dollar',
  symbol: '$',
  createdAt: new Date(),
  updatedAt: new Date()
}

// Setup mock implementations
beforeEach(() => {
  vi.mocked(CurrencyRepository.getAllCurrencies).mockResolvedValue([mockCurrency])
  vi.mocked(CurrencyRepository.getCurrencyByCode).mockResolvedValue(mockCurrency)
  vi.mocked(CurrencyRepository.createCurrency).mockResolvedValue(mockCurrency)
  vi.mocked(CurrencyRepository.updateCurrency).mockResolvedValue({
    ...mockCurrency,
    name: 'Updated US Dollar'
  })
  vi.mocked(CurrencyRepository.deleteCurrency).mockResolvedValue(mockCurrency)
})

describe('CurrencyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllCurrencies', () => {
    it('should return all currencies', async () => {
      const currencies = await CurrencyService.getAllCurrencies()
      expect(currencies).toEqual([mockCurrency])
      expect(CurrencyRepository.getAllCurrencies).toHaveBeenCalled()
    })
  })

  describe('getCurrency', () => {
    it('should get currency by string code', async () => {
      const currency = await CurrencyService.getCurrency('USD')
      expect(currency).toEqual(mockCurrency)
      expect(CurrencyRepository.getCurrencyByCode).toHaveBeenCalledWith('USD')
    })

    it('should get currency by numeric code', async () => {
      const currency = await CurrencyService.getCurrency(123)
      expect(currency).toEqual(mockCurrency)
      expect(CurrencyRepository.getCurrencyByCode).toHaveBeenCalledWith('123')
    })

    it('should throw for non-existent currency', async () => {
      vi.mocked(CurrencyRepository.getCurrencyByCode).mockRejectedValue(new NotFoundError('Currency not found'))
      await expect(CurrencyService.getCurrency('XXX')).rejects.toThrow('Currency not found')
    })
  })

  describe('createCurrency', () => {
    it('should create valid currency', async () => {
      const currency = await CurrencyService.createCurrency({
        currency_code: 'USD',
        name: 'US Dollar'
      })
      expect(currency).toEqual(mockCurrency)
      expect(CurrencyRepository.createCurrency).toHaveBeenCalled()
    })

    it('should reject invalid currency code', async () => {
      await expect(CurrencyService.createCurrency({
        currency_code: 'US', // Too short
        name: 'US Dollar'
      })).rejects.toThrow()
    })

    it('should reject missing required fields', async () => {
      await expect(CurrencyService.createCurrency({
        currency_code: 'USD',
        name: '' // Empty name
      })).rejects.toThrow()
    })
  })

  describe('updateCurrency', () => {
    it('should update currency', async () => {
      const updated = await CurrencyService.updateCurrency('USD', {
        name: 'Updated US Dollar'
      })
      expect(updated.name).toBe('Updated US Dollar')
      expect(CurrencyRepository.updateCurrency).toHaveBeenCalled()
    })

    it('should throw for non-existent currency', async () => {
      vi.mocked(CurrencyRepository.getCurrencyByCode).mockRejectedValue(new NotFoundError('Currency not found'))
      await expect(CurrencyService.updateCurrency('XXX', {
        name: 'Updated'
      })).rejects.toThrow('Currency not found')
    })
  })

  describe('deleteCurrency', () => {
    it('should delete currency', async () => {
      const deleted = await CurrencyService.deleteCurrency('USD')
      expect(deleted).toEqual(mockCurrency)
      expect(CurrencyRepository.deleteCurrency).toHaveBeenCalled()
    })

    it('should throw for non-existent currency', async () => {
      vi.mocked(CurrencyRepository.getCurrencyByCode).mockRejectedValue(new NotFoundError('Currency not found'))
      await expect(CurrencyService.deleteCurrency('XXX')).rejects.toThrow('Currency not found')
    })
  })
})
