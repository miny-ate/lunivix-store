# Provider Activation Guide

## Current safe state

Lunivix has verified **read-only PayHero API access** using server-side Basic authorization generated from managed API username and password secrets. The application does not initiate an STK Push unless `PAYHERO_LIVE_ENABLED=true` is explicitly approved and configured. No payment was created during validation.

| Provider | Current state | Required before live activation |
|---|---|---|
| PayHero / M-Pesa | Credentials verified; payment initiation disabled | Register final callback URL, enable merchant-approved live mode, confirm refund/reconciliation process, and test with an approved internal order. |
| WhatsApp | Product-aware enquiry link available | Choose Meta Cloud API or click-to-chat, register business number/templates, and supply approved credentials if automated notifications are required. |
| Transactional email | Not connected | Select provider, verify sending domain, create a server-side API key, and approve customer communication templates. |
| Delivery tracking | Manual operations workflow available | Choose a courier API only if automated tracking is needed; otherwise admins can update carrier and tracking references manually. |

## PayHero go-live checklist

1. Register `https://<production-domain>/api/payhero/callback` with PayHero once the production domain is known.
2. Keep PayHero username, password, and channel ID in managed server secrets only. Never put them in Git, browser code, messages, or screenshots.
3. Confirm the channel belongs to the Lunivix merchant account and that the M-Pesa settlement and refund process is approved.
4. Set `PAYHERO_LIVE_ENABLED=true` only after reviewing a test order and callback handling with the merchant.
5. Monitor the first production payment in the private payment-reconciliation screen before releasing fulfilment.

## Private commercial controls

Supplier costs, freight, clearing, local delivery, and margin inputs are private commercial data. They must remain in administrator-only procedures and immutable quotation revision snapshots, never in public catalogue responses, customer account pages, generated customer PDFs, or client-side source code. Administrators may revise commercial terms only through the private quotation workflow; each saved edit produces a new customer-safe PDF and an append-only server-assigned revision record.
