import crypto from 'crypto';
import { prisma } from './auth.service';
import { StripeService } from './stripe.service';

const LICENSE_SECRET = process.env.LICENSE_SECRET || 'default-secret-please-change';
const LICENSE_SALT = process.env.LICENSE_SALT || 'default-salt-please-change';

export type LicenseValidationResult = {
  valid: boolean;
  reason?: string;
  userId?: number;
  expiresAt?: Date;
  isOffline?: boolean;
};

export const LicenseService = {
  /**
   * Generates a chaos theory-based license key
   * @param userId - User ID to associate with license
   * @param subscriptionId - Stripe subscription ID
   * @param expiresAt - License expiration date
   * @returns Deterministic but unpredictable license key
   */
  async generateLicenseKey(userId: number, subscriptionId: string, expiresAt: Date): Promise<string> {
    // Create deterministic but unpredictable seed
    const seed = `${userId}-${subscriptionId}-${expiresAt.getTime()}-${LICENSE_SALT}`;
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    
    // Split into chunks and transform using chaos algorithm
    const chunks = [
      hash.substring(0, 8),
      hash.substring(8, 16), 
      hash.substring(16, 24),
      hash.substring(24, 32)
    ];

    // Apply deterministic chaos transformations
    const transformed = chunks.map((chunk, i) => {
      const chaosFactor = parseInt(chunk, 16) % 26;
      return chunk
        .split('')
        .map(c => {
          const code = c.charCodeAt(0);
          // Only transform alphabetic characters
          if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
            return String.fromCharCode(code + chaosFactor);
          }
          return c;
        })
        .join('');
    });

    // Combine with metadata and signature
    const payload = {
      u: userId,
      s: subscriptionId,
      e: expiresAt.getTime(),
      c: transformed.join('-')
    };

    const signature = this._generateSignature(payload);
    return `${btoa(JSON.stringify(payload))}.${signature}`;
  },

  /**
   * Validates license key (online mode - checks Stripe)
   */
  async validateOnline(licenseKey: string): Promise<LicenseValidationResult> {
    try {
      const { payload, valid } = this._verifySignature(licenseKey);
      if (!valid) {
        return { valid: false, reason: 'Invalid signature' };
      }

      // Check expiration
      const expiresAt = new Date(payload.e);
      if (expiresAt < new Date()) {
        return { valid: false, reason: 'License expired' };
      }

      // Verify subscription status with Stripe
      const subscription = await StripeService.createSubscription(payload.s, 'price_123');
      if (subscription.status !== 'active') {
        return { valid: false, reason: 'Subscription not active' };
      }

      return { 
        valid: true,
        userId: payload.u,
        expiresAt,
        isOffline: false
      };
    } catch (err) {
      return { valid: false, reason: 'Validation failed' };
    }
  },

  /**
   * Validates license key (offline mode - checks signature only)
   */
  validateOffline(licenseKey: string): LicenseValidationResult {
    try {
      const { payload, valid } = this._verifySignature(licenseKey);
      if (!valid) {
        return { valid: false, reason: 'Invalid signature' };
      }

      // Check expiration
      const expiresAt = new Date(payload.e);
      if (expiresAt < new Date()) {
        return { valid: false, reason: 'License expired' };
      }

      return { 
        valid: true,
        userId: payload.u,
        expiresAt,
        isOffline: true
      };
    } catch (err) {
      return { valid: false, reason: 'Validation failed' };
    }
  },

  /**
   * Generates HMAC signature for license payload
   */
  _generateSignature(payload: any): string {
    const hmac = crypto.createHmac('sha256', LICENSE_SECRET);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  },

  /**
   * Verifies license signature
   */
  _verifySignature(licenseKey: string): { payload: any; valid: boolean } {
    const [encodedPayload, signature] = licenseKey.split('.');
    if (!encodedPayload || !signature) {
      throw new Error('Invalid license format');
    }

    const payload = JSON.parse(atob(encodedPayload));
    const expectedSignature = this._generateSignature(payload);

    return {
      payload,
      valid: crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    };
  },

  /**
   * Revokes a user's license by clearing their license fields
   * @param userId - User ID to revoke license for
   */
  async revokeLicense(userId: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        licenseKey: null,
        licenseExpiresAt: null
      }
    });
  }
};