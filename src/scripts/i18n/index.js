import { sk as commonSk, en as commonEn } from './common.js';
import { sk as homeSk, en as homeEn } from './home.js';
import { sk as pagesSk, en as pagesEn } from './pages.js';
import { sk as pricingSk, en as pricingEn } from './pricing.js';
import { sk as servicesSk, en as servicesEn } from './services.js';
import { sk as serviceContentSk, en as serviceContentEn } from './service-content.js';

export const sk = {
  ...commonSk,
  ...homeSk,
  ...pagesSk,
  ...pricingSk,
  ...servicesSk,
  ...serviceContentSk
};
export const en = {
  ...commonEn,
  ...homeEn,
  ...pagesEn,
  ...pricingEn,
  ...servicesEn,
  ...serviceContentEn
};
