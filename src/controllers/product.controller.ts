import { Request, Response } from "express";
import * as productService from "../services/product.service";

interface Product {
  product_id: number;
  name: string;
  description?: string;
  price?: number;
  product_code?: string;
  created_at?: Date;
}

export class ProductController {
  async getAll(req: Request, res: Response) {
    try {
      const products = await productService.getAllProducts();
      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const product = await productService.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.status(200).json(product);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const product = await productService.createProduct(req.body);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid product data" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const product = await productService.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.status(200).json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid update data" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const result = await productService.deleteProduct(req.params.id);
      if (!result) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  }
}

export const productController = new ProductController();
