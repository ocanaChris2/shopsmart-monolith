/**
 * @file Integration tests for LicenseService
 * @module test/integration/license.integration.test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LicenseService } from '../../src/services/license.service'
import { prisma } from '../../src/services/auth.service'
import { StripeService } from '../../src/services/stripe.service'

describe('LicenseService Integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('LICENSE_SECRET', 'test-secret')
    vi.stubEnv('LICENSE_SALT', 'test-salt')

    // Setup test user
    await prisma.user.create({
      data: {
        email: 'license-test@example.com',
        passwordHash: 'hashed-test123',
        role: 'USER'
      }
    })
  })

  afterEach(async () => {
    await prisma.user.deleteMany()
  })

  it('should generate and validate license (online mode)', async () => {
    // Create test subscription
    const subscription = await StripeService.createSubscription(
      'test-customer',
      'price_test123'
    )

    // Get test user
    const user = await prisma.user.findFirst()
    if (!user) throw new Error('Test user not found')

    // Generate license
    const expiresAt = new Date(Date.now() + 86400000) // Tomorrow
    const licenseKey = await LicenseService.generateLicenseKey(
      user.id,
      subscription.id,
      expiresAt
    )

    // Validate online
    const result = await LicenseService.validateOnline(licenseKey)
    expect(result).toEqual({
      valid: true,
      userId: user.id,
      expiresAt,
      isOffline: false
    })
  })

  it('should generate and validate license (offline mode)', async () => {
    // Get test user
    const user = await prisma.user.findFirst()
    if (!user) throw new Error('Test user not found')

    // Generate license with test subscription ID
    const expiresAt = new Date(Date.now() + 86400000) // Tomorrow
    const licenseKey = await LicenseService.generateLicenseKey(
      user.id,
      'sub_test123',
      expiresAt
    )

    // Validate offline
    const result = LicenseService.validateOffline(licenseKey)
    expect(result).toEqual({
      valid: true,
      userId: user.id,
      expiresAt,
      isOffline: true
    })
  })

  it('should revoke license', async () => {
    // Get test user
    const user = await prisma.user.findFirst()
    if (!user) throw new Error('Test user not found')

    // Assign license
    await prisma.user.update({
      where: { id: user.id },
      data: {
        licenseKey: 'test-license',
        licenseExpiresAt: new Date(Date.now() + 86400000)
      }
    })

    // Revoke license
    await LicenseService.revokeLicense(user.id)

    // Verify revocation
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id }
    })
    expect(updatedUser?.licenseKey).toBeNull()
    expect(updatedUser?.licenseExpiresAt).toBeNull()
  })
})