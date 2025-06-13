import { describe, expect, it, vi } from 'vitest';
import * as productService from '../../src/services/product.service';
import * as productRepository from '../../src/repositories/product.repository';
import { z } from 'zod';

vi.mock('../../src/repositories/product.repository');

const mockProduct = {
  product_id: 1,
  product_code: 'PROD001',
  name: 'Test Product',
  description: 'Test Description',
  price: 99.99,
  created_at: new Date(),
  updated_at: new Date()
};

describe('Product Service', () => {
  describe('getAllProducts', () => {
    it('should return all products', async () => {
      const mockProducts = [mockProduct];
      vi.mocked(productRepository.getAllProducts).mockResolvedValue(mockProducts);
      
      const result = await productService.getAllProducts();
      expect(result).toEqual(mockProducts);
      expect(productRepository.getAllProducts).toHaveBeenCalled();
    });
  });

  describe('getProduct', () => {
    it('should return a product by id (number)', async () => {
      vi.mocked(productRepository.getProductById).mockResolvedValue(mockProduct);
      
      const result = await productService.getProduct(1);
      expect(result).toEqual(mockProduct);
      expect(productRepository.getProductById).toHaveBeenCalledWith(1);
    });

    it('should return a product by id (string)', async () => {
      vi.mocked(productRepository.getProductById).mockResolvedValue(mockProduct);
      
      const result = await productService.getProduct('1');
      expect(result).toEqual(mockProduct);
      expect(productRepository.getProductById).toHaveBeenCalledWith(1);
    });

    it('should throw error if product not found', async () => {
      vi.mocked(productRepository.getProductById).mockResolvedValue(null);
      
      await expect(productService.getProduct(999)).rejects.toThrow('Product not found');
    });
  });

  describe('createProduct', () => {
    it('should create a product with valid data', async () => {
      const inputData = {
        product_code: 'NEW001',
        name: 'New Product',
        description: 'New Description',
        price: 49.99
      };
      vi.mocked(productRepository.createProduct).mockResolvedValue({
        ...mockProduct,
        ...inputData
      });
      
      const result = await productService.createProduct(inputData);
      expect(result).toMatchObject(inputData);
      expect(productRepository.createProduct).toHaveBeenCalledWith(inputData);
    });

    it('should validate product_code is required and min 3 chars', async () => {
      await expect(productService.createProduct({
        product_code: 'AB', // Too short
        name: 'Test'
      })).rejects.toThrow(z.ZodError);
    });

    it('should validate name is required and min 3 chars', async () => {
      await expect(productService.createProduct({
        product_code: 'ABC',
        name: 'Te' // Too short
      })).rejects.toThrow(z.ZodError);
    });
  });

  describe('updateProduct', () => {
    it('should update a product with valid data', async () => {
      const updateData = { name: 'Updated Name' };
      vi.mocked(productRepository.getProductById).mockResolvedValue(mockProduct);
      vi.mocked(productRepository.updateProduct).mockResolvedValue({
        ...mockProduct,
        ...updateData
      });
      
      const result = await productService.updateProduct(1, updateData);
      expect(result).toMatchObject(updateData);
      expect(productRepository.updateProduct).toHaveBeenCalledWith(1, updateData);
    });

    it('should throw error if product not found', async () => {
      vi.mocked(productRepository.getProductById).mockResolvedValue(null);
      
      await expect(productService.updateProduct(999, { name: 'Test' }))
        .rejects.toThrow('Product not found');
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product', async () => {
      vi.mocked(productRepository.getProductById).mockResolvedValue(mockProduct);
      vi.mocked(productRepository.deleteProduct).mockResolvedValue(mockProduct);
      
      const result = await productService.deleteProduct(1);
      expect(result).toEqual(mockProduct);
      expect(productRepository.deleteProduct).toHaveBeenCalledWith(1);
    });

    it('should throw error if product not found', async () => {
      vi.mocked(productRepository.getProductById).mockResolvedValue(null);
      
      await expect(productService.deleteProduct(999)).rejects.toThrow('Product not found');
    });
  });
});