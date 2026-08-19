import { z } from "zod";
import { createProcurementRequest, createQuotationDraftWithRevision, createQuotationReference, createSupplier, getLostSearches, getNextQuotationRevisionNumber, getQuotationDocumentData, listOperationsOrders, listOrdersForCustomer, listPayments, listProcurementRequests, listQuotationRevisions, listQuotations, listSuppliers, recordPayment, recordSearchEvent, searchCatalog, updateDelivery, updatePaymentStatus, updateProcurementStatus, updateQuotationDraftWithRevision } from "./db";
import { storagePut } from "./storage";
import { calculateSellingPrice, toCustomerQuoteDocumentLines, toQuotationRevisionSnapshot } from "./commercial";
import { generateAndStoreQuotePdf } from "./quotes";
import { createQuoteWithFirstRevision, updateQuoteWithNewRevision } from "./quote-revision-workflow";
import { payHeroStatus } from "./payhero";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { COOKIE_NAME } from "../shared/const";

const showcaseProducts = [
  { id: "showcase-washer", sku: "LNX-WX-24", name: "24kg Commercial Washer Extractor", brand: "Alliance", category: "laundry", productType: "equipment", authenticity: "genuine_oem", model: "WX-24", summary: "High-throughput washer extractor for hotels, hospitals, and commercial laundries.", priceKsh: "680000", availability: "quote_only", leadTime: "4–6 weeks", imageUrl: "/manus-storage/laundry-washer_bbe31e55.jpg", datasheetUrl: "" },
  { id: "showcase-thermostat", sku: "CR0684490", name: "Digital Refrigeration Thermostat", brand: "Carel", category: "refrigeration", productType: "spare_part", authenticity: "genuine_oem", model: "IR33", summary: "OEM control component for commercial refrigeration equipment.", priceKsh: "18500", availability: "in_stock", leadTime: "1–2 days", imageUrl: "/manus-storage/refrigeration-parts_8cfc3d95.png", datasheetUrl: "" },
  { id: "showcase-griddle", sku: "LNX-KT-58", name: "Heavy-Duty Gas Griddle", brand: "Lunivix Select", category: "kitchen", productType: "equipment", authenticity: "alternative", model: "GT-900", summary: "Professional flat-top griddle for high-volume commercial kitchens.", priceKsh: "quote", availability: "on_order", leadTime: "3–5 weeks", imageUrl: "/manus-storage/commercial-kitchen_0cdbd064.jpg", datasheetUrl: "" },
  { id: "showcase-pump", sku: "191144", name: "Drain Pump Assembly", brand: "Electrolux Professional", category: "dishwashing", productType: "spare_part", authenticity: "compatible", model: "EP-191", summary: "Verified compatible replacement for selected commercial dishwasher models.", priceKsh: "27900", availability: "in_stock", leadTime: "1–2 days", imageUrl: "/manus-storage/refrigeration-parts_8cfc3d95.png", datasheetUrl: "" },
];

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new Error("Administrator access required");
  return next();
});

const quotationLineItemInput = z.object({
  description: z.string().trim().min(2).max(300),
  partNumber: z.string().trim().max(160).optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  privateCostSnapshot: z.object({
    supplierCost: z.number().positive(),
    freight: z.number().positive(),
    clearing: z.number().positive(),
    localDelivery: z.number().positive(),
    marginRate: z.number().positive().max(1),
  }),
});

const quotationDraftInput = z.object({
  customerId: z.number().int().positive(),
  customerName: z.string().trim().min(2).max(180),
  validityNote: z.string().trim().min(2).max(120),
  leadTime: z.string().trim().min(2).max(120),
  deliveryNote: z.string().trim().min(2).max(500),
  vatRate: z.number().min(0).max(1),
  items: z.array(quotationLineItemInput).min(1).max(80),
});

async function prepareQuotationRevision(input: z.infer<typeof quotationDraftInput>, reference: string, revisionNumber: number) {
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const vat = Number((subtotal * input.vatRate).toFixed(2));
  const total = subtotal + vat;
  const pdf = await generateAndStoreQuotePdf({
    reference,
    revision: revisionNumber,
    customerName: input.customerName,
    validity: input.validityNote,
    vatRate: input.vatRate,
    deliveryNote: input.deliveryNote,
    leadTime: input.leadTime,
    items: toCustomerQuoteDocumentLines(input.items),
  });
  return {
    documentKey: pdf.key,
    documentUrl: pdf.url,
    privateCostSnapshot: toQuotationRevisionSnapshot({
      customerName: input.customerName,
      validityNote: input.validityNote,
      leadTime: input.leadTime,
      deliveryNote: input.deliveryNote,
      subtotal,
      vat,
      total,
      items: input.items,
    }),
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalog: router({
    list: publicProcedure.query(() => showcaseProducts),
    search: publicProcedure.input(z.object({ query: z.string().trim().min(1).max(300), source: z.enum(["header", "catalog", "part_search"]).default("catalog") })).query(async ({ input, ctx }) => {
      const localMatches = showcaseProducts.filter((product) =>
        [product.sku, product.name, product.brand, product.model, product.summary].join(" ").toLowerCase().includes(input.query.toLowerCase()),
      );
      const dbMatches = await searchCatalog(input.query);
      const matches = dbMatches.length > 0 ? dbMatches : localMatches;
      await recordSearchEvent(input.query, matches.length, input.source, ctx.user?.id);
      return matches;
    }),
  }),
  procurement: router({
    create: protectedProcedure.input(z.object({
      requestType: z.enum(["find_part", "procurement", "quick_order", "rfq"]),
      brand: z.string().max(120).optional(),
      equipmentType: z.string().max(160).optional(),
      model: z.string().max(160).optional(),
      partNumber: z.string().max(160).optional(),
      quantity: z.number().int().positive().max(100000).optional(),
      description: z.string().min(10).max(10000),
      deliveryLocation: z.string().max(220).optional(),
      attachmentKeys: z.array(z.string().max(500)).max(8).optional(),
    })).mutation(async ({ input, ctx }) => {
      const request = await createProcurementRequest({ ...input, customerId: ctx.user.id });
      return { accepted: true, reference: request.reference, persisted: request.persisted };
    }),
    uploadAttachment: protectedProcedure.input(z.object({
      fileName: z.string().min(1).max(180).regex(/^[a-zA-Z0-9._ -]+$/),
      mimeType: z.enum(["application/pdf", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/jpeg", "image/png"]),
      base64: z.string().min(4).max(7_000_000),
    })).mutation(async ({ input, ctx }) => {
      const bytes = Buffer.from(input.base64, "base64");
      if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Attachment exceeds the 5MB limit");
      const safeName = input.fileName.replace(/\s+/g, "-");
      return storagePut(`procurement/${ctx.user.id}/${Date.now()}-${safeName}`, bytes, input.mimeType);
    }),
  }),
  account: router({
    orders: protectedProcedure.query(({ ctx }) => listOrdersForCustomer(ctx.user.id)),
  }),
  payments: router({
    providerStatus: publicProcedure.query(() => payHeroStatus()),
    previewCheckout: protectedProcedure.input(z.object({ orderReference: z.string().min(3).max(80), amount: z.number().positive(), phoneNumber: z.string().min(9).max(20) })).mutation(({ input }) => ({
      accepted: true,
      mode: "safe-simulation" as const,
      provider: "PayHero" as const,
      orderReference: input.orderReference,
      amount: input.amount,
      phoneLastFour: input.phoneNumber.slice(-4),
      message: "No STK Push or customer charge was created. Enable merchant-approved live mode only after callback verification is configured.",
    })),
  }),
  admin: router({
    lostSearches: adminProcedure.query(() => getLostSearches()),
    suppliers: adminProcedure.query(() => listSuppliers()),
    createSupplier: adminProcedure.input(z.object({ supplierName: z.string().min(2).max(220), country: z.string().max(100).optional(), contactName: z.string().max(160).optional(), contactEmail: z.string().email().optional(), leadTimeNotes: z.string().max(2000).optional() })).mutation(({ input }) => createSupplier(input)),
    procurementRequests: adminProcedure.query(() => listProcurementRequests()),
    updateProcurementStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["new", "review", "sourcing", "quoted", "approved", "ordered", "delivered", "closed"]) })).mutation(({ input }) => updateProcurementStatus(input.id, input.status)),
    orders: adminProcedure.query(() => listOperationsOrders()),
    recordPayment: adminProcedure.input(z.object({ orderId: z.number().int().positive(), method: z.enum(["mpesa", "bank_transfer", "card", "other"]), amount: z.string().regex(/^\d+(\.\d{1,2})?$/), providerReference: z.string().max(160).optional() })).mutation(({ input }) => recordPayment(input)),
    updateDelivery: adminProcedure.input(z.object({ orderId: z.number().int().positive(), status: z.enum(["pending", "processing", "shipped", "in_transit", "delivered"]), carrier: z.string().max(160).optional(), trackingReference: z.string().max(160).optional() })).mutation(({ input }) => updateDelivery(input)),
    payments: adminProcedure.query(() => listPayments()),
    updatePaymentStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "partially_paid", "paid", "refunded", "failed"]), providerReference: z.string().max(160).optional() })).mutation(({ input }) => updatePaymentStatus(input.id, input.status, input.providerReference)),
    quotations: adminProcedure.query(() => listQuotations()),
    quotationDetail: adminProcedure.input(z.object({ quotationId: z.number().int().positive() })).query(async ({ input }) => {
      const quotation = await getQuotationDocumentData(input.quotationId);
      if (!quotation) throw new Error("Quotation was not found");
      return quotation;
    }),
    quotationRevisions: adminProcedure.input(z.object({ quotationId: z.number().int().positive() })).query(({ input }) => listQuotationRevisions(input.quotationId)),
    createQuoteDraft: adminProcedure.input(quotationDraftInput).mutation(async ({ input, ctx }) => {
      const outcome = await createQuoteWithFirstRevision({
        input,
        createReference: createQuotationReference,
        prepare: prepareQuotationRevision,
        persist: (quoteInput, revision) => createQuotationDraftWithRevision(quoteInput, { reference: revision.reference, revisionNumber: revision.revisionNumber, documentKey: revision.documentKey, privateCostSnapshot: revision.privateCostSnapshot, createdBy: ctx.user.id }),
      });
      return { ...outcome.result, revisionNumber: outcome.revisionNumber, documentUrl: outcome.documentUrl };
    }),
    updateQuoteDraft: adminProcedure.input(quotationDraftInput.extend({ quotationId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const { quotationId, ...quoteInput } = input;
      const outcome = await updateQuoteWithNewRevision({
        quotationId,
        input: quoteInput,
        loadCurrent: async (id) => (await getQuotationDocumentData(id))?.quote,
        getNextRevisionNumber: getNextQuotationRevisionNumber,
        prepare: prepareQuotationRevision,
        persist: (id, updatedInput, revision) => updateQuotationDraftWithRevision(id, updatedInput, { revisionNumber: revision.revisionNumber, documentKey: revision.documentKey, privateCostSnapshot: revision.privateCostSnapshot, createdBy: ctx.user.id }),
      });
      return { ...outcome.result, revisionNumber: outcome.revisionNumber, documentUrl: outcome.documentUrl };
    }),
    calculateSellingPrice: adminProcedure.input(z.object({
      supplierCost: z.number().nonnegative(), freight: z.number().nonnegative(), clearing: z.number().nonnegative(), localDelivery: z.number().nonnegative(), marginRate: z.number().min(0).max(1), vatRate: z.number().min(0).max(1),
    })).query(({ input }) => {
      return { sellingPrice: calculateSellingPrice(input) };
    }),
  }),
});

export type AppRouter = typeof appRouter;
