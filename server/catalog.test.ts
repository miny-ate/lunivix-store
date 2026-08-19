import { describe, expect, it } from "vitest";
import { calculateSellingPrice, toCustomerQuoteDocumentLines, toPublicQuoteView, toQuotationRevisionSnapshot } from "./commercial";

function nextRevision(currentRevisions: number[]) {
  return (currentRevisions.length ? Math.max(...currentRevisions) : 0) + 1;
}

describe("Lunivix commercial safeguards", () => {
  it("calculates a customer selling price without exposing private inputs", () => {
    expect(calculateSellingPrice({ supplierCost: 100000, freight: 12000, clearing: 8000, localDelivery: 5000, marginRate: 0.2, vatRate: 0.16 })).toBe(174000);
  });

  it("excludes supplier costs and margins from the customer-facing quotation view", () => {
    const quote = toPublicQuoteView({ reference: "LNX-QT-000001", status: "sent", total: 174000, privateCost: { supplierCost: 100000, freight: 12000, clearing: 8000, localDelivery: 5000, marginRate: 0.2, vatRate: 0.16 } });
    expect(quote).toEqual({ reference: "LNX-QT-000001", status: "sent", total: 174000, validUntil: null });
    expect(JSON.stringify(quote)).not.toContain("supplierCost");
    expect(JSON.stringify(quote)).not.toContain("marginRate");
  });

  it("preserves the full private cost snapshot for an immutable revision while stripping it from customer document lines", () => {
    const privateCostSnapshot = { supplierCost: 100000, freight: 12000, clearing: 8000, localDelivery: 5000, marginRate: 0.2 };
    const storedLine = { description: "24kg Commercial Washer Extractor", partNumber: "LNX-WX-24", quantity: 2, unitPrice: "150000.00", privateCostSnapshot };
    const revisionSnapshot = { lineItems: [{ ...storedLine, privateCostSnapshot: { ...storedLine.privateCostSnapshot } }] };
    const documentLines = toCustomerQuoteDocumentLines([storedLine]);

    expect(revisionSnapshot.lineItems[0]?.privateCostSnapshot).toEqual(privateCostSnapshot);
    expect(documentLines).toEqual([{ description: "24kg Commercial Washer Extractor", partNumber: "LNX-WX-24", quantity: 2, unitPrice: 150000 }]);
    expect(JSON.stringify(documentLines)).not.toContain("supplierCost");
    expect(JSON.stringify(documentLines)).not.toContain("freight");
    expect(JSON.stringify(documentLines)).not.toContain("marginRate");
  });

  it("retains earlier immutable revision snapshots when commercial terms change", () => {
    const initial = toQuotationRevisionSnapshot({
      customerName: "Lunivix Hotel", validityNote: "14 days", leadTime: "4 weeks", deliveryNote: "Delivered to Nairobi",
      subtotal: "150000", vat: "24000", total: "174000",
      items: [{ description: "Washer extractor", partNumber: "LNX-WX-24", quantity: 1, unitPrice: "150000", privateCostSnapshot: { supplierCost: 100000, freight: 12000, clearing: 8000, localDelivery: 5000, marginRate: 0.2 } }],
    });
    const updated = toQuotationRevisionSnapshot({
      customerName: "Lunivix Hotel", validityNote: "30 days", leadTime: "5 weeks", deliveryNote: "Delivered to Nairobi",
      subtotal: "162000", vat: "25920", total: "187920",
      items: [{ description: "Washer extractor", partNumber: "LNX-WX-24", quantity: 1, unitPrice: "162000", privateCostSnapshot: { supplierCost: 100000, freight: 14000, clearing: 8000, localDelivery: 5000, marginRate: 0.28 } }],
    });

    expect(initial).not.toEqual(updated);
    expect(initial.commercialTerms.validityNote).toBe("14 days");
    expect(initial.lineItems[0]?.privateCostSnapshot).toEqual({ supplierCost: 100000, freight: 12000, clearing: 8000, localDelivery: 5000, marginRate: 0.2 });
    expect(updated.commercialTerms.validityNote).toBe("30 days");
  });

  it("creates an immutable next quotation revision number", () => {
    expect(nextRevision([1, 2, 4])).toBe(5);
    expect(nextRevision([])).toBe(1);
  });

  it("treats an unmatched query as a lost search candidate", () => {
    const products = ["CR0684490", "191144", "KM 3390196"];
    expect(products.filter((part) => part.toLowerCase().includes("unknown-part"))).toHaveLength(0);
  });
});
