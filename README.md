# Lunivix

Lunivix is a mobile-first B2B/B2C commerce and procurement platform for commercial equipment and genuine spare parts. It separates the public catalogue and customer experience from private supplier, procurement, and commercial-cost operations.

## Delivered capabilities

The storefront includes responsive catalogue and product journeys, OEM/compatible product labels, part-number search, lost-search intelligence, quote and procurement foundations, customer account foundations, order tracking, and product-aware WhatsApp enquiries. The private administrator workspace manages supplier profiles, procurement requests, quotations, payments, and delivery updates.

The quotation workspace supports multiple line items. Each line accepts an optional part number, quantity, supplier cost, freight, clearing, local delivery, and margin percentage. Customer name, validity, lead time, delivery terms, and VAT are required. Lunivix derives the customer unit price from the private landed-cost formula, keeps private cost components server-side, and renders only customer-safe information in the PDF.

| Control | Delivered behaviour |
|---|---|
| Draft composition | Administrators can add or remove items before saving a quotation draft. |
| Commercial validation | Supplier cost, freight, clearing, local delivery, and margin must be positive KSh or percentage inputs; margin is stored as a decimal rate. |
| Customer terms | Customer name, validity, lead time, delivery terms, and VAT are required before save. |
| Immutable revisions | A first PDF/revision is created with a draft. Editing stored terms creates the next server-assigned revision; previous snapshots and documents are retained. |
| Revision integrity | PDF generation is performed before a single database transaction persists changed quotation terms, line items, and the new revision record. |
| Privacy boundary | Supplier costs, logistics costs, and margin snapshots are unavailable to public APIs, customer-facing pages, and customer PDFs. |

## Development and verification

```bash
pnpm install
pnpm dev
pnpm check
pnpm test
pnpm build
```

The project uses React, Vite, Express, tRPC, Drizzle ORM, and a MySQL-compatible database. Keep `.env` files, supplier information, and commercial pricing out of Git.

Database updates are tracked under `drizzle/`. For a new environment, generate and review migrations before applying them. The quotation workflow includes a `partNumber` field on quotation line items and a unique `(quotationId, revisionNumber)` constraint for revision integrity.

## PayHero M-Pesa safe mode

PayHero uses **server-side Basic authorization derived from a managed username and password**. The platform remains non-charging by default: the preview checkout is a safe simulation, live STK Push initiation is disabled unless `PAYHERO_LIVE_ENABLED=true`, and the callback endpoint rejects live processing until the merchant-controlled go-live steps are complete.

| Variable | Purpose |
|---|---|
| `PAYHERO_API_USERNAME` | Server-only PayHero API username. |
| `PAYHERO_API_PASSWORD` | Server-only PayHero API password used to derive Basic authorization at runtime. |
| `PAYHERO_CHANNEL_ID` | Numeric ID of the Lunivix PayHero payment channel. |
| `PAYHERO_LIVE_ENABLED` | Set to `true` only after callback registration, merchant approval, and an approved production-readiness review. |

Run the read-only channel check with the configured managed secrets:

```bash
PAYHERO_VERIFY_LIVE=true pnpm vitest run server/payhero.test.ts
```

This check authenticates against the payment-channel endpoint only; it does **not** initiate an STK Push or charge a customer. The go-live checklist is in [PROVIDER_ACTIVATION.md](./PROVIDER_ACTIVATION.md).

## Deployment and GitHub

The project includes GitHub Actions CI for type checks, tests, and production builds. For an external Node-capable host, use `pnpm build` and `pnpm start`, configure the managed database and object storage services, and add secrets through the host’s secure secret manager. A production deployment must register `https://<production-domain>/api/payhero/callback` with PayHero before live payments are enabled.

Lunivix is compatible with Manus built-in hosting and custom domains. Do not add a custom Dockerfile unless production requires an additional system binary or runtime.

## Security principles

Supplier information, private landed-cost components, and margin data are administrator-only records. Customer-facing quotation PDFs display commercial descriptions, optional part numbers, quantities, prices, VAT, validity, lead time, and delivery terms, but never disclose private cost inputs. Revision records are append-only, and workflow-level tests cover revision ordering, retained earlier snapshots, and failures before transactional persistence.
