import {
  getAllCurrencies as getAllCurrenciesRepo,
  getCurrencyByCode as getCurrencyByCodeRepo,
  createCurrency as createCurrencyRepo,
  updateCurrency as updateCurrencyRepo,
  deleteCurrency as deleteCurrencyRepo
} from '../repositories/currency.repository';
import { Currency } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { z } from 'zod';
import { NotFoundError } from '../errors';

const currencySchema = z.object({
  currency_code: z.string().length(3),
  name: z.string().min(2),
  symbol: z.string().optional()
});

export const getAllCurrencies = async () => {
  return await getAllCurrenciesRepo();
};

export const getCurrency = async (code: string | number): Promise<Currency> => {
  const currencyCode = typeof code === 'number' ? code.toString() : code;
  const currency = await getCurrencyByCodeRepo(currencyCode);
  if (!currency) {
    throw new NotFoundError('Currency not found');
  }
  return currency;
};

export const createCurrency = async (data: unknown): Promise<Currency> => {
  try {
    const validatedData = currencySchema.parse(data);
    return await createCurrencyRepo(validatedData);
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      throw error; // Preserve Prisma error type
    }
    throw error; // Re-throw ZodError or other errors
  }
};

export const updateCurrency = async (code: string | number, data: unknown): Promise<Currency> => {
  const currencyCode = typeof code === 'number' ? code.toString() : code;
  try {
    // First check if currency exists
    const existing = await getCurrencyByCodeRepo(currencyCode);
    if (!existing) {
      throw new NotFoundError('Currency not found');
    }
    const validatedData = currencySchema.partial().parse(data);
    return await updateCurrencyRepo(currencyCode, validatedData);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error; // Propagate NotFoundError
    }
    if (error instanceof z.ZodError) {
      throw error;
    }
    console.error('Failed to update currency:', error);
    throw error; // Preserve original error type
  }
};

export const deleteCurrency = async (code: string | number): Promise<Currency> => {
  const currencyCode = typeof code === 'number' ? code.toString() : code;
  try {
    const existing = await getCurrencyByCodeRepo(currencyCode);
    if (!existing) {
      throw new NotFoundError('Currency not found');
    }
    await deleteCurrencyRepo(currencyCode);
    return existing;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error; // Propagate NotFoundError
    }
    console.error('Failed to delete currency:', error);
    throw error; // Preserve original error type
  }
};
