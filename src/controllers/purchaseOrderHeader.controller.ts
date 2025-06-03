import { Request, Response } from 'express';
import * as purchaseOrderHeaderService from '../services/purchaseOrderHeader.service';

class PurchaseOrderHeaderController {
  async getAll(req: Request, res: Response) {
    try {
      const orders = await purchaseOrderHeaderService.getAllPurchaseOrderHeaders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const po_number = req.params.id;
      const order = await purchaseOrderHeaderService.getPurchaseOrderHeader(po_number);
      res.json(order);
    } catch (error: any) {
      if (error.message === 'PurchaseOrderHeader not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to fetch purchase order' });
      }
    }
  }

  async create(req: Request, res: Response) {
    try {
      const order = await purchaseOrderHeaderService.createPurchaseOrderHeader(req.body);
      res.status(201).json(order);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Invalid purchase order data' });
      }
    }
  }

  async update(req: Request, res: Response) {
    try {
      const po_number = req.params.id;
      const order = await purchaseOrderHeaderService.updatePurchaseOrderHeader(po_number, req.body);
      res.json(order);
    } catch (error: any) {
      if (error.message === 'PurchaseOrderHeader not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('not found')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Invalid purchase order data' });
      }
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const po_number = req.params.id;
      await purchaseOrderHeaderService.deletePurchaseOrderHeader(po_number);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'PurchaseOrderHeader not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete purchase order' });
      }
    }
  }
}

export const purchaseOrderHeaderController = new PurchaseOrderHeaderController();
