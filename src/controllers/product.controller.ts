import { BaseController } from './base.controller';
import * as productService from '../services/product.service';

import { Product } from '@prisma/client';

class ProductController extends BaseController<Product> {
  constructor() {
    super({
      getAll: productService.getAllProducts,
      getById: productService.getProduct,
      create: productService.createProduct,
      update: productService.updateProduct,
      delete: productService.deleteProduct
    });
  }
}

export const productController = new ProductController();
