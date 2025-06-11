import { Request, Response } from 'express';
import * as priceListDetailService from '../services/priceListDetail.service';
import { PriceListDetail } from '@prisma/client';

class PriceListDetailController {
  async getAll(req: Request, res: Response) {
    try {
      const priceListDetails = await priceListDetailService.getPriceListDetails();
      res.json(priceListDetails);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch price list details' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const priceListDetail = await priceListDetailService.getPriceListDetail(req.params.id);
      if (!priceListDetail) {
        return res.status(404).json({ error: 'Price list detail not found' });
      }
      res.json(priceListDetail);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch price list detail' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const priceListDetail = await priceListDetailService.createPriceListDetail(req.body);
      res.status(201).json(priceListDetail);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create price list detail' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const priceListDetail = await priceListDetailService.updatePriceListDetail(req.params.id, req.body);
      if (!priceListDetail) {
        return res.status(404).json({ error: 'Price list detail not found' });
      }
      res.json(priceListDetail);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update price list detail' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const priceListDetail = await priceListDetailService.deletePriceListDetail(req.params.id);
      if (!priceListDetail) {
        return res.status(404).json({ error: 'Price list detail not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete price list detail' });
    }
  }
}

export const priceListDetailController = new PriceListDetailController();
