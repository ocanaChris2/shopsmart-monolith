/**
 * @file Unit tests for LicenseService
 * @module test/services/license.service.test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LicenseService } from '../../src/services/license.service'
import { StripeService } from '../../src/services/stripe.service'
import { prisma } from '../../src/services/auth.service'

// Mock StripeService
vi.mock('../../src/services/stripe.service', () => ({
  createSubscription: vi.fn()
}))

// Mock Prisma
vi.mock('../../src/services/auth.service', () => ({
  prisma: {
    user: {
      update: vi.fn().mockResolvedValue({})
    }
  }
}))

describe('LicenseService', () => {
  const mockUserId = 123
  const mockSubscriptionId = 'sub_123'
  const mockExpiresAt = new Date(Date.now() + 86400000) // Tomorrow
  const mockLicenseKey = 'eyJ1IjoxMjMsInMiOiJzdWJfMTIzIiwiZSI6MTY5OTk5OTk5OTk5OSwiYyI6ImFiY2QtZWZnLWhpai1rbG0ifQ==.mock-signature'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('LICENSE_SECRET', 'test-secret')
    vi.stubEnv('LICENSE_SALT', 'test-salt')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('generateLicenseKey', () => {
    it('should generate a valid license key structure', async () => {
      const key = await LicenseService.generateLicenseKey(
        mockUserId,
        mockSubscriptionId,
        mockExpiresAt
      )
      
      expect(key).toMatch(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+$/)
      expect(key.split('.')).toHaveLength(2)
    })
  })

  describe('validateOnline', () => {
    it('should validate active subscription', async () => {
      vi.mocked(StripeService.createSubscription).mockResolvedValue({
        status: 'active'
      } as any)

      const result = await LicenseService.validateOnline(mockLicenseKey)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid signature', async () => {
      const result = await LicenseService.validateOnline('invalid.key')
      expect(result).toEqual({
        valid: false,
        reason: 'Invalid signature'
      })
    })
  })

  describe('validateOffline', () => {
    it('should validate properly signed license', () => {
      const result = LicenseService.validateOffline(mockLicenseKey)
      expect(result.valid).toBe(true)
    })

    it('should reject expired license', async () => {
      const expiredKey = await LicenseService.generateLicenseKey(
        mockUserId,
        mockSubscriptionId,
        new Date(Date.now() - 86400000) // Yesterday
      )
      
      const result = LicenseService.validateOffline(expiredKey)
      expect(result.valid).toBe(false)
    })
  })

  describe('revokeLicense', () => {
    it('should clear license fields', async () => {
      await LicenseService.revokeLicense(mockUserId)
      
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          licenseKey: null,
          licenseExpiresAt: null
        }
      })
    })
  })
})