export type PrivateCostInput = {
  supplierCost: number;
  freight: number;
  clearing: number;
  localDelivery: number;
  marginRate: number;
  vatRate: number;
};

export function calculateSellingPrice(input: PrivateCostInput) {
  const landedCost = input.supplierCost + input.freight + input.clearing + input.localDelivery;
  const preVat = landedCost * (1 + input.marginRate);
  return Number((preVat * (1 + input.vatRate)).toFixed(2));
}

export function toPublicQuoteView(input: { reference: string; status: string; total: number; validUntil?: Date | null; privateCost: PrivateCostInput }) {
  return { reference: input.reference, status: input.status, total: input.total, validUntil: input.validUntil ?? null };
}

export function toCustomerQuoteDocumentLines(items: Array<{ description: string; partNumber?: string | null; quantity: number; unitPrice: string | number; privateCostSnapshot: unknown }>) {
  return items.map((item) => ({
    description: item.description,
    partNumber: item.partNumber ?? undefined,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
  }));
}

export function toQuotationRevisionSnapshot(input: {
  customerName: string;
  validityNote: string;
  leadTime?: string | null;
  deliveryNote?: string | null;
  subtotal: string | number;
  vat: string | number;
  total: string | number;
  items: Array<{ description: string; partNumber?: string | null; quantity: number; unitPrice: string | number; privateCostSnapshot: unknown }>;
}) {
  return {
    commercialTerms: {
      customerName: input.customerName,
      validityNote: input.validityNote,
      leadTime: input.leadTime ?? null,
      deliveryNote: input.deliveryNote ?? null,
      subtotal: Number(input.subtotal),
      vat: Number(input.vat),
      total: Number(input.total),
    },
    lineItems: input.items.map((item) => ({
      description: item.description,
      partNumber: item.partNumber ?? null,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      privateCostSnapshot: item.privateCostSnapshot,
    })),
  };
}
