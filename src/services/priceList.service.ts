import { 
  getAllPriceLists as getAllPriceListsRepo,
  getPriceListById as getPriceListByIdRepo,
  createPriceList as createPriceListRepo,
  updatePriceList as updatePriceListRepo,
  deletePriceList as deletePriceListRepo
} from '../repositories/priceList.repository';
import { z } from 'zod';

const priceListSchema = z.object({
  name: z.string().min(2),
  valid_from: z.date(),
  valid_to: z.date().optional()
});

export const getAllPriceLists = async () => {
  return await getAllPriceListsRepo();
};

export const getPriceList = async (id: string | number) => {
  const priceListId = typeof id === 'string' ? parseInt(id) : id;
  const priceList = await getPriceListByIdRepo(priceListId);
  if (!priceList) {
    throw new Error('PriceList not found');
  }
  return priceList;
};

export const createPriceList = async (data: unknown) => {
  const validatedData = priceListSchema.parse(data);
  return await createPriceListRepo(validatedData);
};

export const updatePriceList = async (id: string | number, data: unknown) => {
  const priceListId = typeof id === 'string' ? parseInt(id) : id;
  const priceList = await getPriceListByIdRepo(priceListId);
  if (!priceList) {
    throw new Error('PriceList not found');
  }
  const validatedData = priceListSchema.partial().parse(data);
  return await updatePriceListRepo(priceListId, validatedData);
};

export const deletePriceList = async (id: string | number) => {
  const priceListId = typeof id === 'string' ? parseInt(id) : id;
  const priceList = await getPriceListByIdRepo(priceListId);
  if (!priceList) {
    throw new Error('PriceList not found');
  }
  return await deletePriceListRepo(priceListId);
};
