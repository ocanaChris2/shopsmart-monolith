import Stripe from 'stripe';
// Stripe now provides its own types - no need for @types/stripe
import { prisma } from './auth.service';
import { Request, Response } from 'express';
import type { User } from './auth.service';
import { LicenseService } from './license.service';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

// Extend Prisma client type for subscription fields
type ExtendedPrismaClient = typeof prisma & {
  user: {
    update: (args: {
      where: { id: number };
      data: {
        stripeCustomerId?: string;
        subscriptionStatus?: 'ACTIVE' | 'CANCELED' | 'PAST_DUE';
      }
    }) => Promise<User>;
  }
};

const extendedPrisma = prisma as ExtendedPrismaClient;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

function isErrorWithMessage(err: unknown): err is { message: string } {
  return typeof err === 'object' && err !== null && 'message' in err;
}

export const StripeService = {
  async createCustomer(email: string, name?: string): Promise<string> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: { system: 'shopsmart' }
      });
      return customer.id;
    } catch (err) {
      console.error('Failed to create Stripe customer:', err);
      throw new Error('Failed to create customer account');
    }
  },

  async createPaymentIntent(amount: number, currency: string, customerId: string): Promise<string> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        automatic_payment_methods: { enabled: true },
      });
      if (!paymentIntent.client_secret) {
        throw new Error('Failed to create payment intent - no client secret returned');
      }
      return paymentIntent.client_secret;
    } catch (err) {
      console.error('Failed to create payment intent:', err);
      throw new Error('Failed to process payment');
    }
  },

  async createSubscription(customerId: string, priceId: string): Promise<Stripe.Subscription> {
    try {
      return await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
    } catch (err) {
      console.error('Failed to create subscription:', err);
      throw new Error('Failed to create subscription');
    }
  },

  async handlePaymentWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      res.status(400).send('Missing Stripe signature');
      return;
    }

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      const message = isErrorWithMessage(err) ? err.message : 'Unknown error occurred';
      res.status(400).send(`Webhook Error: ${message}`);
      return;
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancel(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePayment(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  },

  async handlePaymentSuccess(payment: Stripe.PaymentIntent): Promise<void> {
    const customerId = typeof payment.customer === 'string' ? payment.customer : payment.customer?.id;
    if (!customerId) return;

    await (prisma as any).user.update({
      where: { stripeCustomerId: customerId },
      data: { subscriptionStatus: 'ACTIVE' }
    });
  },

  async handlePaymentFailure(payment: Stripe.PaymentIntent): Promise<void> {
    const customerId = typeof payment.customer === 'string' ? payment.customer : payment.customer?.id;
    if (!customerId) return;

    // Log payment failure and potentially notify user
    console.log(`Payment failed for customer ${customerId}`);
  },

  async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;
      
    if (!customerId) return;

    const status = subscription.status.toUpperCase();
    if (status !== 'ACTIVE' && status !== 'CANCELED' && status !== 'PAST_DUE') {
      throw new Error(`Invalid subscription status: ${status}`);
    }

    await (prisma as any).user.update({
      where: { stripeCustomerId: customerId },
      data: {
        subscriptionStatus: status
      }
    });
  },

  async handleSubscriptionCancel(subscription: Stripe.Subscription): Promise<void> {
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;
      
    if (!customerId) return;

    // First get user to revoke their license
    const user = await (prisma as any).user.findUnique({
      where: { stripeCustomerId: customerId }
    });

    if (user?.id) {
      try {
        await LicenseService.revokeLicense(user.id);
      } catch (err) {
        console.error(`Failed to revoke license for user ${user.id}:`, err);
      }
    }

    await (prisma as any).user.update({
      where: { stripeCustomerId: customerId },
      data: {
        subscriptionStatus: 'CANCELED',
        licenseKey: null,
        licenseExpiresAt: null
      }
    });
  },

  async handleInvoicePayment(invoice: Stripe.Invoice): Promise<void> {
    // Handle successful invoice payments (e.g., renewal payments)
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    await (prisma as any).user.update({
      where: { stripeCustomerId: customerId },
      data: {
        subscriptionStatus: 'ACTIVE'
      }
    });
  }
};
