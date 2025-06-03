import { 
  getAllPurchaseOrderHeaders as getAllPurchaseOrderHeadersRepo,
  getPurchaseOrderHeaderById as getPurchaseOrderHeaderByIdRepo,
  createPurchaseOrderHeader as createPurchaseOrderHeaderRepo,
  updatePurchaseOrderHeader as updatePurchaseOrderHeaderRepo,
  deletePurchaseOrderHeader as deletePurchaseOrderHeaderRepo
} from '../repositories/purchaseOrderHeader.repository';
import { z } from 'zod';

const purchaseOrderHeaderSchema = z.object({
  po_number: z.string().min(1),
  order_date: z.date(),
  total_amount: z.number().positive(),
  status: z.string().min(1)
});

export const getAllPurchaseOrderHeaders = async () => {
  return await getAllPurchaseOrderHeadersRepo();
};

export const getPurchaseOrderHeader = async (po_number: string) => {
  const header = await getPurchaseOrderHeaderByIdRepo(po_number);
  if (!header) {
    throw new Error('PurchaseOrderHeader not found');
  }
  return header;
};

export const createPurchaseOrderHeader = async (data: unknown) => {
  const validatedData = purchaseOrderHeaderSchema.parse(data);
  return await createPurchaseOrderHeaderRepo(validatedData);
};

export const updatePurchaseOrderHeader = async (po_number: string, data: unknown) => {
  const header = await getPurchaseOrderHeaderByIdRepo(po_number);
  if (!header) {
    throw new Error('PurchaseOrderHeader not found');
  }

  const validatedData = purchaseOrderHeaderSchema.partial().parse(data);
  return await updatePurchaseOrderHeaderRepo(po_number, validatedData);
};

export const deletePurchaseOrderHeader = async (po_number: string) => {
  const header = await getPurchaseOrderHeaderByIdRepo(po_number);
  if (!header) {
    throw new Error('PurchaseOrderHeader not found');
  }
  return await deletePurchaseOrderHeaderRepo(po_number);
};
