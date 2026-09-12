/** Maximum bill slip images stored against one customer (mirrors the server). */
export const MAX_BILL_IMAGES = 10;

/**
 * Every bill image for a customer.
 *
 * Rows created before the gallery existed only carry the single billImageUrl,
 * so both shapes are accepted and always come back as an array.
 */
export const getBillImages = (customer) => {
  if (!customer) return [];
  if (Array.isArray(customer.billImages) && customer.billImages.length > 0) {
    return customer.billImages.filter(Boolean);
  }
  return customer.billImageUrl ? [customer.billImageUrl] : [];
};

/** The image used as a thumbnail in lists and cards. */
export const getCoverBillImage = (customer) => getBillImages(customer)[0] || '';
