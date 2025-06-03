import { 
  getPurchaseOrderDetails as getPurchaseOrderDetailsRepo,
  getPurchaseOrderDetailById as getPurchaseOrderDetailByIdRepo,
  createPurchaseOrderDetail as createPurchaseOrderDetailRepo,
  updatePurchaseOrderDetail as updatePurchaseOrderDetailRepo,
  deletePurchaseOrderDetail as deletePurchaseOrderDetailRepo
} from '../repositories/purchaseOrderDetail.repository';
import { z } from 'zod';
import { getProductByCode as getProductByCodeRepo } from '../repositories/product.repository';
import { getPurchaseOrderHeaderById as getPurchaseOrderHeaderByIdRepo } from '../repositories/purchaseOrderHeader.repository';

const purchaseOrderDetailSchema = z.object({
  po_number: z.string().min(1),
  product_code: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().positive()
});

export const getPurchaseOrderDetails = async (po_number: string) => {
  return await getPurchaseOrderDetailsRepo(po_number);
};

export const getPurchaseOrderDetail = async (id: number) => {
  const detail = await getPurchaseOrderDetailByIdRepo(id);
  if (!detail) {
    throw new Error('PurchaseOrderDetail not found');
  }
  return detail;
};

export const createPurchaseOrderDetail = async (data: unknown) => {
  const validatedData = purchaseOrderDetailSchema.parse(data);
  
  // Validate relationships exist
  await Promise.all([
    getPurchaseOrderHeaderByIdRepo(validatedData.po_number),
    getProductByCodeRepo(validatedData.product_code)
  ]).then(([header, product]) => {
    if (!header) throw new Error('PurchaseOrderHeader not found');
    if (!product) throw new Error('Product not found');
  });

  return await createPurchaseOrderDetailRepo(validatedData);
};

export const updatePurchaseOrderDetail = async (id: number, data: unknown) => {
  const detail = await getPurchaseOrderDetailByIdRepo(id);
  if (!detail) {
    throw new Error('PurchaseOrderDetail not found');
  }

  const validatedData = purchaseOrderDetailSchema.partial().parse(data);
  
  if (validatedData.po_number || validatedData.product_code) {
    await Promise.all([
      validatedData.po_number ? getPurchaseOrderHeaderByIdRepo(validatedData.po_number) : Promise.resolve(),
      validatedData.product_code ? getProductByCodeRepo(validatedData.product_code) : Promise.resolve()
    ]).then(([header, product]) => {
      if (validatedData.po_number && !header) throw new Error('PurchaseOrderHeader not found');
      if (validatedData.product_code && !product) throw new Error('Product not found');
    });
  }

  return await updatePurchaseOrderDetailRepo(id, validatedData);
};

export const deletePurchaseOrderDetail = async (id: number) => {
  const detail = await getPurchaseOrderDetailByIdRepo(id);
  if (!detail) {
    throw new Error('PurchaseOrderDetail not found');
  }
  return await deletePurchaseOrderDetailRepo(id);
};
