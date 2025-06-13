import { describe, expect, it, vi } from 'vitest';
import * as purchaseOrderHeaderService from '../../src/services/purchaseOrderHeader.service';
import * as purchaseOrderHeaderRepository from '../../src/repositories/purchaseOrderHeader.repository';
import { z } from 'zod';

vi.mock('../../src/repositories/purchaseOrderHeader.repository');

const mockHeader = {
  po_number: 'PO001',
  supplier_id: 1,
  order_date: new Date(),
  created_at: new Date(),
  updated_at: new Date(),
  total_amount: 999.99,
  status: 'PENDING',
  details: [
    {
      id: 1,
      po_number: 'PO001',
      product_code: 'PROD001',
      quantity: 10,
      unit_price: 99.99,
      product: {
        product_id: 1,
        product_code: 'PROD001',
        name: 'Test Product',
        price: 99.99,
        description: 'Test Description',
        created_at: new Date()
      }
    }
  ]
};

describe('PurchaseOrderHeader Service', () => {
  describe('getAllPurchaseOrderHeaders', () => {
    it('should return all purchase order headers', async () => {
      const mockHeaders = [mockHeader];
      vi.mocked(purchaseOrderHeaderRepository.getAllPurchaseOrderHeaders)
        .mockResolvedValue(mockHeaders);
      
      const result = await purchaseOrderHeaderService.getAllPurchaseOrderHeaders();
      expect(result).toEqual(mockHeaders);
      expect(purchaseOrderHeaderRepository.getAllPurchaseOrderHeaders).toHaveBeenCalled();
    });
  });

  describe('getPurchaseOrderHeader', () => {
    it('should return a purchase order header by po_number', async () => {
      vi.mocked(purchaseOrderHeaderRepository.getPurchaseOrderHeaderById)
        .mockResolvedValue(mockHeader);
      
      const result = await purchaseOrderHeaderService.getPurchaseOrderHeader('PO001');
      expect(result).toEqual(mockHeader);
      expect(purchaseOrderHeaderRepository.getPurchaseOrderHeaderById)
        .toHaveBeenCalledWith('PO001');
    });

    it('should throw error if purchase order header not found', async () => {
      vi.mocked(purchaseOrderHeaderRepository.getPurchaseOrderHeaderById)
        .mockResolvedValue(null);
      
      await expect(purchaseOrderHeaderService.getPurchaseOrderHeader('INVALID'))
        .rejects.toThrow('PurchaseOrderHeader not found');
    });
  });

  describe('createPurchaseOrderHeader', () => {
    it('should create a purchase order header with valid data', async () => {
      const inputData = {
        po_number: 'PO002',
        order_date: new Date(),
        total_amount: 500,
        status: 'APPROVED'
      };
      vi.mocked(purchaseOrderHeaderRepository.createPurchaseOrderHeader)
        .mockResolvedValue({
          ...mockHeader,
          ...inputData
        });
      
      const result = await purchaseOrderHeaderService.createPurchaseOrderHeader(inputData);
      expect(result).toMatchObject(inputData);
      expect(purchaseOrderHeaderRepository.createPurchaseOrderHeader)
        .toHaveBeenCalledWith(inputData);
    });

    it('should validate required fields', async () => {
      await expect(purchaseOrderHeaderService.createPurchaseOrderHeader({
        po_number: '', // Invalid
        order_date: new Date('invalid'), // Invalid
        total_amount: 0, // Invalid
        status: '' // Invalid
      })).rejects.toThrow(z.ZodError);
    });
  });

  describe('updatePurchaseOrderHeader', () => {
    it('should update a purchase order header with valid data', async () => {
      const updateData = { status: 'COMPLETED' };
      vi.mocked(purchaseOrderHeaderRepository.getPurchaseOrderHeaderById)
        .mockResolvedValue(mockHeader);
      vi.mocked(purchaseOrderHeaderRepository.updatePurchaseOrderHeader)
        .mockResolvedValue({
          ...mockHeader,
          ...updateData
        });
      
      const result = await purchaseOrderHeaderService.updatePurchaseOrderHeader('PO001', updateData);
      expect(result).toMatchObject(updateData);
      expect(purchaseOrderHeaderRepository.updatePurchaseOrderHeader)
        .toHaveBeenCalledWith('PO001', updateData);
    });

    it('should throw error if purchase order header not found', async () => {
      vi.mocked(purchaseOrderHeaderRepository.getPurchaseOrderHeaderById)
        .mockResolvedValue(null);
      
      await expect(purchaseOrderHeaderService.updatePurchaseOrderHeader('INVALID', { status: 'COMPLETED' }))
        .rejects.toThrow('PurchaseOrderHeader not found');
    });
  });

  describe('deletePurchaseOrderHeader', () => {
    it('should delete a purchase order header', async () => {
      vi.mocked(purchaseOrderHeaderRepository.getPurchaseOrderHeaderById)
        .mockResolvedValue(mockHeader);
      vi.mocked(purchaseOrderHeaderRepository.deletePurchaseOrderHeader)
        .mockResolvedValue(mockHeader);
      
      const result = await purchaseOrderHeaderService.deletePurchaseOrderHeader('PO001');
      expect(result).toEqual(mockHeader);
      expect(purchaseOrderHeaderRepository.deletePurchaseOrderHeader)
        .toHaveBeenCalledWith('PO001');
    });

    it('should throw error if purchase order header not found', async () => {
      vi.mocked(purchaseOrderHeaderRepository.getPurchaseOrderHeaderById)
        .mockResolvedValue(null);
      
      await expect(purchaseOrderHeaderService.deletePurchaseOrderHeader('INVALID'))
        .rejects.toThrow('PurchaseOrderHeader not found');
    });
  });
});