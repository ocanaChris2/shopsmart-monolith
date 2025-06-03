import { BaseController } from './base.controller';
import * as priceListDetailService from '../services/priceListDetail.service';
import { PriceListDetail } from '@prisma/client';

class PriceListDetailController extends BaseController<PriceListDetail> {
  constructor() {
    super({
      getAll: priceListDetailService.getPriceListDetails,
      getById: priceListDetailService.getPriceListDetail,
      create: priceListDetailService.createPriceListDetail,
      update: priceListDetailService.updatePriceListDetail,
      delete: priceListDetailService.deletePriceListDetail
    });
  }
}

export const priceListDetailController = new PriceListDetailController();
