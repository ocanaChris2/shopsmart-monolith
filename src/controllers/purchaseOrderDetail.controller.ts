import { Request, Response } from 'express';
import * as purchaseOrderDetailService from '../services/purchaseOrderDetail.service';

class PurchaseOrderDetailController {
  async getAll(req: Request, res: Response) {
    try {
      const po_number = req.params.order_id;
      const details = await purchaseOrderDetailService.getPurchaseOrderDetails(po_number);
      res.json(details);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch order details' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const detail = await purchaseOrderDetailService.getPurchaseOrderDetail(id);
      res.json(detail);
    } catch (error: any) {
      if (error.message === 'PurchaseOrderDetail not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to fetch order detail' });
      }
    }
  }

  async create(req: Request, res: Response) {
    try {
      const detail = await purchaseOrderDetailService.createPurchaseOrderDetail(req.body);
      res.status(201).json(detail);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Invalid order detail data' });
      }
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const detail = await purchaseOrderDetailService.updatePurchaseOrderDetail(id, req.body);
      res.json(detail);
    } catch (error: any) {
      if (error.message === 'PurchaseOrderDetail not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('not found')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Invalid order detail data' });
      }
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await purchaseOrderDetailService.deletePurchaseOrderDetail(id);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'PurchaseOrderDetail not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete order detail' });
      }
    }
  }
}

export const purchaseOrderDetailController = new PurchaseOrderDetailController();
