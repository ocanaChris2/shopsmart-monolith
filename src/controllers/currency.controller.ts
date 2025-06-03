import { BaseController } from './base.controller';
import * as currencyService from '../services/currency.service';
import { Currency } from '@prisma/client';

class CurrencyController extends BaseController<Currency> {
  constructor() {
    super({
      getAll: currencyService.getAllCurrencies,
      getById: currencyService.getCurrency,
      create: currencyService.createCurrency,
      update: currencyService.updateCurrency,
      delete: currencyService.deleteCurrency
    });
  }
}

export const currencyController = new CurrencyController();
