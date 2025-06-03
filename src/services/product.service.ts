import { 
  getAllProducts as getAllProductsRepo,
  getProductById as getProductByIdRepo,
  createProduct as createProductRepo,
  updateProduct as updateProductRepo,
  deleteProduct as deleteProductRepo
} from '../repositories/product.repository';
import { z } from 'zod';

const productSchema = z.object({
  product_code: z.string().min(3),
  name: z.string().min(3),
  description: z.string().optional(),
  price: z.number().positive().optional()
});

export const getAllProducts = async () => {
  return await getAllProductsRepo();
};

export const getProduct = async (id: string | number) => {
  const productId = typeof id === 'string' ? parseInt(id) : id;
  const product = await getProductByIdRepo(productId);
  if (!product) {
    throw new Error('Product not found');
  }
  return product;
};

export const createProduct = async (data: unknown) => {
  const validatedData = productSchema.parse(data);
  return await createProductRepo(validatedData);
};

export const updateProduct = async (id: string | number, data: unknown) => {
  const productId = typeof id === 'string' ? parseInt(id) : id;
  const product = await getProductByIdRepo(productId);
  if (!product) {
    throw new Error('Product not found');
  }
  const validatedData = productSchema.partial().parse(data);
  return await updateProductRepo(productId, validatedData);
};

export const deleteProduct = async (id: string | number) => {
  const productId = typeof id === 'string' ? parseInt(id) : id;
  const product = await getProductByIdRepo(productId);
  if (!product) {
    throw new Error('Product not found');
  }
  return await deleteProductRepo(productId);
};
