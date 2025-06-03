import { 
  getPriceListDetails as getPriceListDetailsRepo,
  getPriceListDetailById as getPriceListDetailByIdRepo,
  createPriceListDetail as createPriceListDetailRepo,
  updatePriceListDetail as updatePriceListDetailRepo,
  deletePriceListDetail as deletePriceListDetailRepo
} from '../repositories/priceListDetail.repository';
import { z } from 'zod';

const priceListDetailSchema = z.object({
  price_list_id: z.number(),
  product_id: z.number(),
  price: z.number().positive(),
  currency_code: z.string().length(3),
  valid_from: z.date().optional(),
  valid_to: z.date().optional()
});

export const getPriceListDetails = async () => {
  return await getPriceListDetailsRepo();
};

export const getPriceListDetail = async (id: string | number) => {
  const detailId = typeof id === 'string' ? parseInt(id) : id;
  const detail = await getPriceListDetailByIdRepo(detailId);
  if (!detail) {
    throw new Error('PriceListDetail not found');
  }
  return detail;
};

export const createPriceListDetail = async (data: unknown) => {
  const validatedData = priceListDetailSchema.parse(data);
  return await createPriceListDetailRepo(validatedData);
};

export const updatePriceListDetail = async (id: string | number, data: unknown) => {
  const detailId = typeof id === 'string' ? parseInt(id) : id;
  const detail = await getPriceListDetailByIdRepo(detailId);
  if (!detail) {
    throw new Error('PriceListDetail not found');
  }
  const validatedData = priceListDetailSchema.partial().parse(data);
  return await updatePriceListDetailRepo(detailId, validatedData);
};

export const deletePriceListDetail = async (id: string | number) => {
  const detailId = typeof id === 'string' ? parseInt(id) : id;
  const detail = await getPriceListDetailByIdRepo(detailId);
  if (!detail) {
    throw new Error('PriceListDetail not found');
  }
  return await deletePriceListDetailRepo(detailId);
};
