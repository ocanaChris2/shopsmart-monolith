import { describe, expect, it, vi } from 'vitest';
import * as purchaseOrderDetailService from '../../src/services/purchaseOrderDetail.service';
import * as purchaseOrderDetailRepository from '../../src/repositories/purchaseOrderDetail.repository';
import * as productRepository from '../../src/repositories/product.repository';
import * as purchaseOrderHeaderRepository from '../../src/repositories/purchaseOrderHeader.repository';
import { z } from 'zod';

vi.mock('../../src/repositories/purchaseOrderDetail.repository');
vi.mock('../../src/repositories/product.repository');
vi.mock('../../src/repositories/purchaseOrderHeader.repository');

const mockDetail = {
  id: 1,
  po_number: 'PO001',
  product_code: 'PROD001',
  quantity: 10,
  unit_price: 99.99,
  created_at: new Date(),
  updated_at: new Date(),
  product: {
    product_id: 1,
    product_code: 'PROD001',
    name: 'Test Product',
    price: 99.99,
    description: 'Test Description',
    created_at: new Date()
  },
  header: {
    po_number: 'PO001',
    supplier_id: 1,
    order_date: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    total_amount: 999.99,
    status: 'PENDING'
  }
};

const mockProduct = {
  product_id: 1,
  product_code: 'PROD001',
  name: 'Test Product',
  price: 99.99,
  description: 'Test Description',
  created_at: new Date()
};

const mockHeader = {
  po_number: 'PO001',
  supplier_id: 1,
  order_date: new Date(),
  created_at: new Date(),
  updated_at: new Date(),
  total_amount: 999.99,
  status: 'PENDING'
};

describe('PurchaseOrderDetail Service', () => {
  describe('getPurchaseOrderDetails', () => {
    it('should return details for a PO', async () => {
      const mockDetails = [mockDetail];
      vi.mocked(purchaseOrderDetailRepository.getPurchaseOrderDetails)
        .mockResolvedValue(mockDetails);
      
      const result = await purchaseOrderDetailService.getPurchaseOrderDetails('PO001');
      expect(result).toEqual(mockDetails);
      expect(purchaseOrderDetailRepository.getPurchaseOrderDetails)
        .toHaveBeenCalledWith('PO001');
    });
  });

  describe('getPurchaseOrderDetail', () => {
    it('should return a detail by id', async () => {
      vi.mocked(purchaseOrderDetailRepository.getPurchaseOrderDetailById)
        .mockResolvedValue(mockDetail);
      
      const result = await purchaseOrderDetailService.getPurchaseOrderDetail(1);
      expect(result).toEqual(mockDetail);
    });

    it('should throw error if detail not found', async () => {
      vi.mocked(purchaseOrderDetailRepository.getPurchaseOrderDetailById)
        .mockResolvedValue(null);
      
      await expect(purchaseOrderDetailService.getPurchaseOrderDetail(999))
        .rejects.toThrow('PurchaseOrderDetail not found');
    });
  });

  describe('createPurchaseOrderDetail', () => {
    it('should create a detail with valid data', async () => {
      const inputData = {
        po_number: 'PO001',
        product_code: 'PROD001',
        quantity: 5,
        unit_price: 49.99
      };

      vi.mocked(purchaseOrderHeaderRepository.getPurchaseOrderHeaderById)
        .mockResolvedValue(mockHeader);
      vi.mocked(productRepository.getProductByCode)
        .mockResolvedValue(mockProduct);
      vi.mocked(purchaseOrderDetailRepository.createPurchaseOrderDetail)
        .mockResolvedValue({
          ...mockDetail,
          ...inputData
        });
      
      const result = await purchaseOrderDetailService.createPurchaseOrderDetail(inputData);
      expect(result).toMatchObject(inputData);
      expect(purchaseOrderDetailRepository.createPurchaseOrderDetail)
        .toHaveBeenCalledWith(inputData);
    });

    it('should validate required fields', async () => {
      await expect(purchaseOrderDetailService.createPurchaseOrderDetail({
        po_number: '', // Invalid
        product_code: '', // Invalid
        quantity: 0, // Invalid
        unit_price: 0 // Invalid
      })).rejects.toThrow(z.ZodError);
    });

    it('should validate PO header exists', async () => {
      vi.mocked(purchaseOrderHeaderRepository.getPurchaseOrderHeaderById)
        .mockResolvedValue(null);
      vi.mocked(productRepository.getProductByCode)
        .mockResolvedValue(mockProduct);
      
      await expect(purchaseOrderDetailService.createPurchaseOrderDetail({
        po_number: 'PO001',
        product_code: 'PROD001',
        quantity: 5,
        unit_price: 49.99
      })).rejects.toThrow('PurchaseOrderHeader not found');
    });

    it('should validate product exists', async () => {
      vi.mocked(purchaseOrderHeaderRepository.getPurchaseOrderHeaderById)
        .mockResolvedValue(mockHeader);
      vi.mocked(productRepository.getProductByCode)
        .mockResolvedValue(null);
      
      await expect(purchaseOrderDetailService.createPurchaseOrderDetail({
        po_number: 'PO001',
        product_code: 'PROD001',
        quantity: 5,
        unit_price: 49.99
      })).rejects.toThrow('Product not found');
    });
  });

  describe('updatePurchaseOrderDetail', () => {
    it('should update a detail with valid data', async () => {
      const updateData = { quantity: 15 };
      vi.mocked(purchaseOrderDetailRepository.getPurchaseOrderDetailById)
        .mockResolvedValue(mockDetail);
      vi.mocked(purchaseOrderDetailRepository.updatePurchaseOrderDetail)
        .mockResolvedValue({
          ...mockDetail,
          ...updateData
        });
      
      const result = await purchaseOrderDetailService.updatePurchaseOrderDetail(1, updateData);
      expect(result).toMatchObject(updateData);
    });

    it('should validate PO header exists when changing po_number', async () => {
      vi.mocked(purchaseOrderDetailRepository.getPurchaseOrderDetailById)
        .mockResolvedValue(mockDetail);
      vi.mocked(purchaseOrderHeaderRepository.getPurchaseOrderHeaderById)
        .mockResolvedValue(null);
      
      await expect(purchaseOrderDetailService.updatePurchaseOrderDetail(1, {
        po_number: 'NEWPO'
      })).rejects.toThrow('PurchaseOrderHeader not found');
    });

    it('should validate product exists when changing product_code', async () => {
      vi.mocked(purchaseOrderDetailRepository.getPurchaseOrderDetailById)
        .mockResolvedValue(mockDetail);
      vi.mocked(productRepository.getProductByCode)
        .mockResolvedValue(null);
      
      await expect(purchaseOrderDetailService.updatePurchaseOrderDetail(1, {
        product_code: 'NEWPROD'
      })).rejects.toThrow('Product not found');
    });
  });

  describe('deletePurchaseOrderDetail', () => {
    it('should delete a detail', async () => {
      vi.mocked(purchaseOrderDetailRepository.getPurchaseOrderDetailById)
        .mockResolvedValue(mockDetail);
      vi.mocked(purchaseOrderDetailRepository.deletePurchaseOrderDetail)
        .mockResolvedValue(mockDetail);
      
      const result = await purchaseOrderDetailService.deletePurchaseOrderDetail(1);
      expect(result).toEqual(mockDetail);
    });

    it('should throw error if detail not found', async () => {
      vi.mocked(purchaseOrderDetailRepository.getPurchaseOrderDetailById)
        .mockResolvedValue(null);
      
      await expect(purchaseOrderDetailService.deletePurchaseOrderDetail(999))
        .rejects.toThrow('PurchaseOrderDetail not found');
    });
  });
});