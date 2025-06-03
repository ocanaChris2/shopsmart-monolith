import { Request, Response } from 'express';
import * as salesOrderDetailService from '../services/salesOrderDetail.service';

class SalesOrderDetailController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const order_id = parseInt(req.params.order_id);
      const details = await salesOrderDetailService.getSalesOrderDetails(order_id);
      res.json(details);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch order details' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const order_detail_id = parseInt(req.params.id);
      const detail = await salesOrderDetailService.getSalesOrderDetail(order_detail_id);
      res.json(detail);
    } catch (error: any) {
      if (error.message === 'SalesOrderDetail not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to fetch order detail' });
      }
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const detail = await salesOrderDetailService.createSalesOrderDetail(req.body);
      res.status(201).json(detail);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Invalid order detail data' });
      }
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const order_detail_id = parseInt(req.params.id);
      const detail = await salesOrderDetailService.updateSalesOrderDetail(order_detail_id, req.body);
      res.json(detail);
    } catch (error: any) {
      if (error.message === 'SalesOrderDetail not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('not found')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Invalid order detail data' });
      }
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const order_detail_id = parseInt(req.params.id);
      await salesOrderDetailService.deleteSalesOrderDetail(order_detail_id);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'SalesOrderDetail not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete order detail' });
      }
    }
  }
}

export const salesOrderDetailController = new SalesOrderDetailController();
