/** Kategórie partnerov — hero pásik vs. sekcia PARTNERI na homepage */
export const PARTNER_CATEGORIES = {
  hero: {
    label: 'Hero pásik (video hore)',
    page: false,
    order: 0,
  },
  exkluzivny: {
    label: 'Exkluzívni mediálni partneri',
    page: true,
    order: 1,
  },
  medialny: {
    label: 'Mediálni partneri',
    page: true,
    order: 2,
  },
  hlavny: {
    label: 'Hlavní partneri',
    page: true,
    order: 3,
  },
};

export const PARTNER_CATEGORY_IDS = Object.keys(PARTNER_CATEGORIES);

export const PAGE_PARTNER_CATEGORIES = PARTNER_CATEGORY_IDS.filter(
  (id) => PARTNER_CATEGORIES[id].page
).sort((a, b) => PARTNER_CATEGORIES[a].order - PARTNER_CATEGORIES[b].order);

export function isValidPartnerCategory(value) {
  return typeof value === 'string' && PARTNER_CATEGORY_IDS.includes(value);
}

export function normalizePartnerCategory(value, fallback = 'hlavny') {
  return isValidPartnerCategory(value) ? value : fallback;
}
