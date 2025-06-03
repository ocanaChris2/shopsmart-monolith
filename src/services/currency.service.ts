import { 
  getAllCurrencies as getAllCurrenciesRepo,
  getCurrencyByCode as getCurrencyByCodeRepo,
  createCurrency as createCurrencyRepo,
  updateCurrency as updateCurrencyRepo,
  deleteCurrency as deleteCurrencyRepo
} from '../repositories/currency.repository';
import { z } from 'zod';

const currencySchema = z.object({
  currency_code: z.string().length(3),
  name: z.string().min(2),
  symbol: z.string().optional()
});

export const getAllCurrencies = async () => {
  return await getAllCurrenciesRepo();
};

export const getCurrency = async (code: string | number) => {
  const currencyCode = typeof code === 'number' ? code.toString() : code;
  const currency = await getCurrencyByCodeRepo(currencyCode);
  if (!currency) {
    throw new Error('Currency not found');
  }
  return currency;
};

export const createCurrency = async (data: unknown) => {
  const validatedData = currencySchema.parse(data);
  return await createCurrencyRepo(validatedData);
};

export const updateCurrency = async (code: string | number, data: unknown) => {
  const currencyCode = typeof code === 'number' ? code.toString() : code;
  const currency = await getCurrencyByCodeRepo(currencyCode);
  if (!currency) {
    throw new Error('Currency not found');
  }
  const validatedData = currencySchema.partial().parse(data);
  return await updateCurrencyRepo(currencyCode, validatedData);
};

export const deleteCurrency = async (code: string | number) => {
  const currencyCode = typeof code === 'number' ? code.toString() : code;
  const currency = await getCurrencyByCodeRepo(currencyCode);
  if (!currency) {
    throw new Error('Currency not found');
  }
  return await deleteCurrencyRepo(currencyCode);
};
