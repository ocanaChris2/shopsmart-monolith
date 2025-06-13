import { Request, Response, NextFunction } from 'express';
import * as currencyService from '../services/currency.service';
import { Currency } from '@prisma/client';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '../errors';

class CurrencyController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const currencies = await currencyService.getAllCurrencies();
      res.json(currencies);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const currency = await currencyService.getCurrency(req.params.id);
      res.json(currency);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const currency = await currencyService.createCurrency(req.body);
      res.status(201).json(currency);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ValidationError('Validation failed', error.errors));
      } else {
        next(error);
      }
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const currency = await currencyService.updateCurrency(req.params.id, req.body);
      res.json(currency);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ValidationError('Validation failed', error.errors));
      } else {
        next(error);
      }
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await currencyService.deleteCurrency(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const currencyController = new CurrencyController();
