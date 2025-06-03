import { 
  getSalesOrderDetails as getSalesOrderDetailsRepo,
  getSalesOrderDetailById as getSalesOrderDetailByIdRepo,
  createSalesOrderDetail as createSalesOrderDetailRepo,
  updateSalesOrderDetail as updateSalesOrderDetailRepo,
  deleteSalesOrderDetail as deleteSalesOrderDetailRepo
} from '../repositories/salesOrderDetail.repository';
import { z } from 'zod';
import { 
  getProductById as getProductByIdRepo 
} from '../repositories/product.repository';
import { 
  getSalesOrderHeaderById as getSalesOrderHeaderByIdRepo 
} from '../repositories/salesOrderHeader.repository';

const salesOrderDetailSchema = z.object({
  order_id: z.number(),
  product_id: z.number(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  discount: z.number().min(0).max(1).optional().default(0)
});

export const getSalesOrderDetails = async (order_id: number) => {
  return await getSalesOrderDetailsRepo(order_id);
};

export const getSalesOrderDetail = async (order_detail_id: number) => {
  const detail = await getSalesOrderDetailByIdRepo(order_detail_id);
  if (!detail) {
    throw new Error('SalesOrderDetail not found');
  }
  return detail;
};

export const createSalesOrderDetail = async (data: unknown) => {
  const validatedData = salesOrderDetailSchema.parse(data);
  
  // Validate relationships exist
  await Promise.all([
    getSalesOrderHeaderByIdRepo(validatedData.order_id),
    getProductByIdRepo(validatedData.product_id)
  ]).then(([order, product]) => {
    if (!order) throw new Error('SalesOrderHeader not found');
    if (!product) throw new Error('Product not found');
  });

  return await createSalesOrderDetailRepo(validatedData);
};

export const updateSalesOrderDetail = async (order_detail_id: number, data: unknown) => {
  const detail = await getSalesOrderDetailByIdRepo(order_detail_id);
  if (!detail) {
    throw new Error('SalesOrderDetail not found');
  }

  const validatedData = salesOrderDetailSchema.partial().parse(data);
  
  if (validatedData.order_id || validatedData.product_id) {
    await Promise.all([
      validatedData.order_id ? getSalesOrderHeaderByIdRepo(validatedData.order_id) : Promise.resolve(),
      validatedData.product_id ? getProductByIdRepo(validatedData.product_id) : Promise.resolve()
    ]).then(([order, product]) => {
      if (validatedData.order_id && !order) throw new Error('SalesOrderHeader not found');
      if (validatedData.product_id && !product) throw new Error('Product not found');
    });
  }

  return await updateSalesOrderDetailRepo(order_detail_id, validatedData);
};

export const deleteSalesOrderDetail = async (order_detail_id: number) => {
  const detail = await getSalesOrderDetailByIdRepo(order_detail_id);
  if (!detail) {
    throw new Error('SalesOrderDetail not found');
  }
  return await deleteSalesOrderDetailRepo(order_detail_id);
};
