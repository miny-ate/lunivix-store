import { boolean, decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(), openId: varchar("openId", { length: 64 }).notNull().unique(), name: text("name"), email: varchar("email", { length: 320 }), loginMethod: varchar("loginMethod", { length: 64 }), role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const catalogProducts = mysqlTable("catalogProducts", {
  id: int("id").autoincrement().primaryKey(), sku: varchar("sku", { length: 100 }).notNull().unique(), name: varchar("name", { length: 300 }).notNull(), slug: varchar("slug", { length: 340 }).notNull().unique(), brand: varchar("brand", { length: 120 }).notNull(), category: mysqlEnum("category", ["laundry", "kitchen", "refrigeration", "dishwashing"]).notNull(), productType: mysqlEnum("productType", ["equipment", "spare_part"]).notNull(), authenticity: mysqlEnum("authenticity", ["genuine_oem", "compatible", "alternative"]).notNull(), model: varchar("model", { length: 160 }), summary: text("summary").notNull(), specifications: json("specifications"), priceKsh: decimal("priceKsh", { precision: 12, scale: 2 }), availability: mysqlEnum("availability", ["in_stock", "on_order", "quote_only"]).default("quote_only").notNull(), leadTime: varchar("leadTime", { length: 120 }), imageUrl: text("imageUrl"), datasheetUrl: text("datasheetUrl"), isPublished: boolean("isPublished").default(false).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const brands = mysqlTable("brands", {
  id: int("id").autoincrement().primaryKey(), name: varchar("name", { length: 160 }).notNull().unique(), slug: varchar("slug", { length: 180 }).notNull().unique(), description: text("description"), logoUrl: text("logoUrl"), isPublished: boolean("isPublished").default(false).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const savedProducts = mysqlTable("savedProducts", {
  id: int("id").autoincrement().primaryKey(), customerId: int("customerId").notNull(), productId: int("productId").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const carts = mysqlTable("carts", {
  id: int("id").autoincrement().primaryKey(), customerId: int("customerId").notNull().unique(), status: mysqlEnum("status", ["active", "checked_out", "abandoned"]).default("active").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const cartItems = mysqlTable("cartItems", {
  id: int("id").autoincrement().primaryKey(), cartId: int("cartId").notNull(), productId: int("productId").notNull(), quantity: int("quantity").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const searchEvents = mysqlTable("searchEvents", {
  id: int("id").autoincrement().primaryKey(), query: varchar("query", { length: 300 }).notNull(), resultCount: int("resultCount").notNull(), source: mysqlEnum("source", ["header", "catalog", "part_search"]).default("catalog").notNull(), userId: int("userId"), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const supplierProfiles = mysqlTable("supplierProfiles", {
  id: int("id").autoincrement().primaryKey(), supplierName: varchar("supplierName", { length: 220 }).notNull(), country: varchar("country", { length: 100 }), contactName: varchar("contactName", { length: 160 }), contactEmail: varchar("contactEmail", { length: 320 }), leadTimeNotes: text("leadTimeNotes"), performanceNotes: text("performanceNotes"), isActive: boolean("isActive").default(true).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const procurementRequests = mysqlTable("procurementRequests", {
  id: int("id").autoincrement().primaryKey(), reference: varchar("reference", { length: 40 }).notNull().unique(), customerId: int("customerId"), requestType: mysqlEnum("requestType", ["find_part", "procurement", "quick_order", "rfq"]).notNull(), status: mysqlEnum("status", ["new", "review", "sourcing", "quoted", "approved", "ordered", "delivered", "closed"]).default("new").notNull(), brand: varchar("brand", { length: 120 }), equipmentType: varchar("equipmentType", { length: 160 }), model: varchar("model", { length: 160 }), partNumber: varchar("partNumber", { length: 160 }), quantity: int("quantity"), description: text("description").notNull(), deliveryLocation: varchar("deliveryLocation", { length: 220 }), requiredDeliveryDate: timestamp("requiredDeliveryDate"), attachmentKeys: json("attachmentKeys"), internalNotes: text("internalNotes"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const quotations = mysqlTable("quotations", {
  id: int("id").autoincrement().primaryKey(), reference: varchar("reference", { length: 40 }).notNull().unique(), customerId: int("customerId").notNull(), customerName: varchar("customerName", { length: 180 }).notNull(), procurementRequestId: int("procurementRequestId"), status: mysqlEnum("status", ["draft", "sent", "accepted", "rejected", "expired"]).default("draft").notNull(), currency: varchar("currency", { length: 6 }).default("KES").notNull(), subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0").notNull(), vat: decimal("vat", { precision: 12, scale: 2 }).default("0").notNull(), total: decimal("total", { precision: 12, scale: 2 }).default("0").notNull(), validUntil: timestamp("validUntil"), validityNote: varchar("validityNote", { length: 120 }).notNull(), leadTime: varchar("leadTime", { length: 120 }), deliveryNote: text("deliveryNote"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const quotationRevisions = mysqlTable("quotationRevisions", {
  id: int("id").autoincrement().primaryKey(), quotationId: int("quotationId").notNull(), revisionNumber: int("revisionNumber").notNull(), documentKey: text("documentKey"), publicNote: text("publicNote"), privateCostSnapshot: json("privateCostSnapshot").notNull(), createdBy: int("createdBy"), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("quotationRevisionUnique").on(table.quotationId, table.revisionNumber)]);

export const quotationLineItems = mysqlTable("quotationLineItems", {
  id: int("id").autoincrement().primaryKey(), quotationId: int("quotationId").notNull(), description: varchar("description", { length: 300 }).notNull(), partNumber: varchar("partNumber", { length: 160 }), quantity: int("quantity").notNull(), unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(), privateCostSnapshot: json("privateCostSnapshot").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(), reference: varchar("reference", { length: 40 }).notNull().unique(), customerId: int("customerId").notNull(), quotationId: int("quotationId"), status: mysqlEnum("status", ["received", "payment_confirmed", "procurement", "supplier_processing", "shipped", "in_transit", "arrived", "out_for_delivery", "delivered", "cancelled"]).default("received").notNull(), subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0").notNull(), vat: decimal("vat", { precision: 12, scale: 2 }).default("0").notNull(), total: decimal("total", { precision: 12, scale: 2 }).default("0").notNull(), deliveryAddress: text("deliveryAddress"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(), orderId: int("orderId").notNull(), method: mysqlEnum("method", ["mpesa", "bank_transfer", "card", "other"]).notNull(), status: mysqlEnum("status", ["pending", "partially_paid", "paid", "refunded", "failed"]).default("pending").notNull(), amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), providerReference: varchar("providerReference", { length: 160 }), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const deliveries = mysqlTable("deliveries", {
  id: int("id").autoincrement().primaryKey(), orderId: int("orderId").notNull().unique(), status: mysqlEnum("status", ["pending", "processing", "shipped", "in_transit", "delivered"]).default("pending").notNull(), carrier: varchar("carrier", { length: 160 }), trackingReference: varchar("trackingReference", { length: 160 }), deliveryNoteKey: text("deliveryNoteKey"), dispatchedAt: timestamp("dispatchedAt"), deliveredAt: timestamp("deliveredAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CatalogProduct = typeof catalogProducts.$inferSelect;
