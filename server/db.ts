import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { catalogProducts, deliveries, InsertUser, orders, payments, procurementRequests, quotationLineItems, quotationRevisions, quotations, searchEvents, supplierProfiles, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export function createQuotationReference() {
  return `LNX-QT-${String(Date.now()).slice(-6)}`;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Connection unavailable", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };
  await db.insert(users).values(values).onDuplicateKeyUpdate({
    set: { name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: new Date() },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function searchCatalog(query: string) {
  const db = await getDb();
  if (!db) return [];
  const term = `%${query.trim()}%`;
  return db
    .select()
    .from(catalogProducts)
    .where(
      and(
        eq(catalogProducts.isPublished, true),
        or(
          like(catalogProducts.sku, term),
          like(catalogProducts.name, term),
          like(catalogProducts.brand, term),
          like(catalogProducts.model, term),
          like(catalogProducts.summary, term),
        ),
      ),
    )
    .orderBy(desc(catalogProducts.updatedAt))
    .limit(24);
}

export async function recordSearchEvent(query: string, resultCount: number, source: "header" | "catalog" | "part_search", userId?: number) {
  const db = await getDb();
  if (!db || !query.trim()) return;
  await db.insert(searchEvents).values({ query: query.trim().slice(0, 300), resultCount, source, userId: userId ?? null });
}

export async function getLostSearches() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ query: searchEvents.query, occurrences: sql<number>`count(*)` })
    .from(searchEvents)
    .where(eq(searchEvents.resultCount, 0))
    .groupBy(searchEvents.query)
    .orderBy(desc(sql`count(*)`))
    .limit(25);
}

export async function createProcurementRequest(input: {
  customerId: number;
  requestType: "find_part" | "procurement" | "quick_order" | "rfq";
  brand?: string;
  equipmentType?: string;
  model?: string;
  partNumber?: string;
  quantity?: number;
  description: string;
  deliveryLocation?: string;
  attachmentKeys?: string[];
}) {
  const db = await getDb();
  const reference = `LNX-PR-${String(Date.now()).slice(-6)}`;
  if (!db) return { reference, persisted: false };
  await db.insert(procurementRequests).values({ ...input, reference, attachmentKeys: input.attachmentKeys ?? [] });
  return { reference, persisted: true };
}

export async function listOrdersForCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt)).limit(50);
}

export async function listSuppliers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supplierProfiles).orderBy(desc(supplierProfiles.updatedAt)).limit(100);
}

export async function createSupplier(input: { supplierName: string; country?: string; contactName?: string; contactEmail?: string; leadTimeNotes?: string }) {
  const db = await getDb();
  if (!db) return { persisted: false };
  await db.insert(supplierProfiles).values(input);
  return { persisted: true };
}

export async function listProcurementRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(procurementRequests).orderBy(desc(procurementRequests.updatedAt)).limit(100);
}

export async function updateProcurementStatus(id: number, status: "new" | "review" | "sourcing" | "quoted" | "approved" | "ordered" | "delivered" | "closed") {
  const db = await getDb();
  if (!db) return { persisted: false };
  await db.update(procurementRequests).set({ status }).where(eq(procurementRequests.id, id));
  return { persisted: true };
}

export async function listOperationsOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.updatedAt)).limit(100);
}

export async function recordPayment(input: { orderId: number; method: "mpesa" | "bank_transfer" | "card" | "other"; amount: string; providerReference?: string }) {
  const db = await getDb();
  if (!db) return { persisted: false };
  await db.insert(payments).values({ ...input, status: "pending" });
  return { persisted: true };
}

export async function updateDelivery(input: { orderId: number; status: "pending" | "processing" | "shipped" | "in_transit" | "delivered"; carrier?: string; trackingReference?: string }) {
  const db = await getDb();
  if (!db) return { persisted: false };
  await db.insert(deliveries).values(input).onDuplicateKeyUpdate({ set: { status: input.status, carrier: input.carrier ?? null, trackingReference: input.trackingReference ?? null } });
  return { persisted: true };
}

export async function createQuoteRevision(input: { quotationId: number; revisionNumber: number; documentKey: string; publicNote?: string; privateCostSnapshot: Record<string, unknown>; createdBy: number }) {
  const db = await getDb();
  if (!db) return { persisted: false };
  await db.insert(quotationRevisions).values(input);
  await db.update(quotations).set({ updatedAt: new Date() }).where(eq(quotations.id, input.quotationId));
  return { persisted: true };
}

export async function createQuotationDraft(input: { customerId: number; customerName: string; validityNote: string; leadTime: string; deliveryNote: string; vatRate: number; items: { description: string; partNumber?: string; quantity: number; unitPrice: number; privateCostSnapshot: Record<string, number> }[]; validUntil?: Date }) {
  const db = await getDb();
  const reference = createQuotationReference();
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const vat = Number((subtotal * input.vatRate).toFixed(2));
  const total = subtotal + vat;
  if (!db) return { id: 0, reference, persisted: false };
  const result = await db.insert(quotations).values({ reference, customerId: input.customerId, customerName: input.customerName, validityNote: input.validityNote, leadTime: input.leadTime, deliveryNote: input.deliveryNote, subtotal: String(subtotal), vat: String(vat), total: String(total), validUntil: input.validUntil ?? null });
  const quotationId = Number(result[0].insertId);
  await db.insert(quotationLineItems).values(input.items.map((item) => ({ quotationId, description: item.description, partNumber: item.partNumber?.trim() || null, quantity: item.quantity, unitPrice: String(item.unitPrice), privateCostSnapshot: item.privateCostSnapshot })));
  return { id: quotationId, reference, persisted: true };
}

export async function createQuotationDraftWithRevision(input: { customerId: number; customerName: string; validityNote: string; leadTime: string; deliveryNote: string; vatRate: number; items: { description: string; partNumber?: string; quantity: number; unitPrice: number; privateCostSnapshot: Record<string, number> }[]; validUntil?: Date }, revision: { reference: string; revisionNumber: number; documentKey: string; privateCostSnapshot: Record<string, unknown>; createdBy: number }) {
  const db = await getDb();
  if (!db) return { id: 0, reference: revision.reference, persisted: false };
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const vat = Number((subtotal * input.vatRate).toFixed(2));
  const total = subtotal + vat;
  return db.transaction(async (tx) => {
    const result = await tx.insert(quotations).values({ reference: revision.reference, customerId: input.customerId, customerName: input.customerName, validityNote: input.validityNote, leadTime: input.leadTime, deliveryNote: input.deliveryNote, subtotal: String(subtotal), vat: String(vat), total: String(total), validUntil: input.validUntil ?? null });
    const quotationId = Number(result[0].insertId);
    await tx.insert(quotationLineItems).values(input.items.map((item) => ({ quotationId, description: item.description, partNumber: item.partNumber?.trim() || null, quantity: item.quantity, unitPrice: String(item.unitPrice), privateCostSnapshot: item.privateCostSnapshot })));
    await tx.insert(quotationRevisions).values({ quotationId, revisionNumber: revision.revisionNumber, documentKey: revision.documentKey, publicNote: `Generated ${revision.reference} from ${input.items.length} stored line item(s)`, privateCostSnapshot: revision.privateCostSnapshot, createdBy: revision.createdBy });
    return { id: quotationId, reference: revision.reference, persisted: true };
  });
}

export async function updateQuotationDraft(quotationId: number, input: { customerId: number; customerName: string; validityNote: string; leadTime: string; deliveryNote: string; vatRate: number; items: { description: string; partNumber?: string; quantity: number; unitPrice: number; privateCostSnapshot: Record<string, number> }[]; validUntil?: Date }) {
  const db = await getDb();
  if (!db) return { id: quotationId, reference: "", persisted: false };
  const existing = (await db.select({ reference: quotations.reference }).from(quotations).where(eq(quotations.id, quotationId)).limit(1))[0];
  if (!existing) throw new Error("Quotation was not found");
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const vat = Number((subtotal * input.vatRate).toFixed(2));
  const total = subtotal + vat;
  await db.update(quotations).set({ customerId: input.customerId, customerName: input.customerName, validityNote: input.validityNote, leadTime: input.leadTime, deliveryNote: input.deliveryNote, subtotal: String(subtotal), vat: String(vat), total: String(total), validUntil: input.validUntil ?? null, updatedAt: new Date() }).where(eq(quotations.id, quotationId));
  await db.delete(quotationLineItems).where(eq(quotationLineItems.quotationId, quotationId));
  await db.insert(quotationLineItems).values(input.items.map((item) => ({ quotationId, description: item.description, partNumber: item.partNumber?.trim() || null, quantity: item.quantity, unitPrice: String(item.unitPrice), privateCostSnapshot: item.privateCostSnapshot })));
  return { id: quotationId, reference: existing.reference, persisted: true };
}

export async function updateQuotationDraftWithRevision(quotationId: number, input: { customerId: number; customerName: string; validityNote: string; leadTime: string; deliveryNote: string; vatRate: number; items: { description: string; partNumber?: string; quantity: number; unitPrice: number; privateCostSnapshot: Record<string, number> }[]; validUntil?: Date }, revision: { revisionNumber: number; documentKey: string; privateCostSnapshot: Record<string, unknown>; createdBy: number }) {
  const db = await getDb();
  if (!db) return { id: quotationId, reference: "", persisted: false };
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const vat = Number((subtotal * input.vatRate).toFixed(2));
  const total = subtotal + vat;
  return db.transaction(async (tx) => {
    const existing = (await tx.select({ reference: quotations.reference }).from(quotations).where(eq(quotations.id, quotationId)).limit(1))[0];
    if (!existing) throw new Error("Quotation was not found");
    await tx.update(quotations).set({ customerId: input.customerId, customerName: input.customerName, validityNote: input.validityNote, leadTime: input.leadTime, deliveryNote: input.deliveryNote, subtotal: String(subtotal), vat: String(vat), total: String(total), validUntil: input.validUntil ?? null, updatedAt: new Date() }).where(eq(quotations.id, quotationId));
    await tx.delete(quotationLineItems).where(eq(quotationLineItems.quotationId, quotationId));
    await tx.insert(quotationLineItems).values(input.items.map((item) => ({ quotationId, description: item.description, partNumber: item.partNumber?.trim() || null, quantity: item.quantity, unitPrice: String(item.unitPrice), privateCostSnapshot: item.privateCostSnapshot })));
    await tx.insert(quotationRevisions).values({ quotationId, revisionNumber: revision.revisionNumber, documentKey: revision.documentKey, publicNote: `Generated ${existing.reference} from ${input.items.length} stored line item(s)`, privateCostSnapshot: revision.privateCostSnapshot, createdBy: revision.createdBy });
    return { id: quotationId, reference: existing.reference, persisted: true };
  });
}

export async function listQuotations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotations).orderBy(desc(quotations.updatedAt)).limit(100);
}

export async function listQuotationRevisions(quotationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotationRevisions).where(eq(quotationRevisions.quotationId, quotationId)).orderBy(desc(quotationRevisions.revisionNumber)).limit(100);
}

export async function getNextQuotationRevisionNumber(quotationId: number) {
  const db = await getDb();
  if (!db) return 1;
  const result = await db
    .select({ latestRevision: sql<number>`coalesce(max(${quotationRevisions.revisionNumber}), 0)` })
    .from(quotationRevisions)
    .where(eq(quotationRevisions.quotationId, quotationId));
  return Number(result[0]?.latestRevision ?? 0) + 1;
}

export async function getQuotationDocumentData(quotationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const quote = (await db.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1))[0];
  if (!quote) return undefined;
  const items = await db.select().from(quotationLineItems).where(eq(quotationLineItems.quotationId, quotationId));
  return { quote, items };
}

export async function listPayments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).orderBy(desc(payments.updatedAt)).limit(100);
}

export async function updatePaymentStatus(id: number, status: "pending" | "partially_paid" | "paid" | "refunded" | "failed", providerReference?: string) {
  const db = await getDb();
  if (!db) return { persisted: false };
  await db.update(payments).set({ status, providerReference: providerReference ?? null }).where(eq(payments.id, id));
  return { persisted: true };
}
