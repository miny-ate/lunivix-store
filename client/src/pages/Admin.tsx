import { useState } from "react";
import { BarChart3, FileText, LockKeyhole, PackageSearch, Plus, RefreshCw, Truck, UsersRound, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import "./quote-workspace.css";

type Tab = "overview" | "suppliers" | "procurement" | "quotes" | "fulfilment";
type QuoteLineForm = {
  id: string;
  description: string;
  partNumber: string;
  quantity: string;
  supplierCost: string;
  freight: string;
  clearing: string;
  localDelivery: string;
  marginPercent: string;
};

const metrics = [
  { label: "New procurement", icon: PackageSearch },
  { label: "Quote revisions", icon: FileText },
  { label: "Active customers", icon: UsersRound },
  { label: "Catalogue insight", icon: BarChart3 },
];
const statuses = ["new", "review", "sourcing", "quoted", "approved", "ordered", "delivered", "closed"] as const;
const deliveryStatuses = ["pending", "processing", "shipped", "in_transit", "delivered"] as const;

function makeQuoteLine(): QuoteLineForm {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    description: "",
    partNumber: "",
    quantity: "1",
    supplierCost: "",
    freight: "",
    clearing: "",
    localDelivery: "",
    marginPercent: "",
  };
}

function numberValue(value: string) {
  return Number(value);
}

function hasValidPricing(line: QuoteLineForm, vatRate: number) {
  const values = [line.quantity, line.supplierCost, line.freight, line.clearing, line.localDelivery, line.marginPercent];
  return values.every((value) => value.trim() !== "" && Number.isFinite(numberValue(value)))
    && numberValue(line.quantity) > 0
    && numberValue(line.supplierCost) > 0
    && numberValue(line.freight) > 0
    && numberValue(line.clearing) > 0
    && numberValue(line.localDelivery) > 0
    && numberValue(line.marginPercent) > 0
    && numberValue(line.marginPercent) <= 100
    && Number.isFinite(vatRate)
    && vatRate >= 0
    && vatRate <= 100;
}

function quoteLinePreview(line: QuoteLineForm, vatRate: number) {
  if (!hasValidPricing(line, vatRate)) return null;
  const landedCost = numberValue(line.supplierCost) + numberValue(line.freight) + numberValue(line.clearing) + numberValue(line.localDelivery);
  const unitPriceBeforeVat = landedCost * (1 + numberValue(line.marginPercent) / 100);
  const unitPriceWithVat = unitPriceBeforeVat * (1 + vatRate / 100);
  return {
    landedCost,
    unitPriceBeforeVat,
    unitPriceWithVat,
    lineTotalWithVat: unitPriceWithVat * numberValue(line.quantity),
  };
}

function formatKsh(value: number) {
  return `KSh ${value.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState<Tab>("overview");
  const [supplierName, setSupplierName] = useState("");
  const [supplierCountry, setSupplierCountry] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [deliveryOrder, setDeliveryOrder] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState<(typeof deliveryStatuses)[number]>("processing");
  const [paymentOrder, setPaymentOrder] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [quoteCustomerId, setQuoteCustomerId] = useState("");
  const [quoteCustomerName, setQuoteCustomerName] = useState("");
  const [quoteValidity, setQuoteValidity] = useState("14 days");
  const [quoteLeadTime, setQuoteLeadTime] = useState("");
  const [quoteDeliveryTerms, setQuoteDeliveryTerms] = useState("");
  const [quoteVatRate, setQuoteVatRate] = useState("16");
  const [quoteLines, setQuoteLines] = useState<QuoteLineForm[]>([makeQuoteLine()]);
  const utils = trpc.useUtils();
  const lostSearches = trpc.admin.lostSearches.useQuery(undefined, { enabled: isAdmin, retry: false });
  const suppliers = trpc.admin.suppliers.useQuery(undefined, { enabled: isAdmin, retry: false });
  const procurement = trpc.admin.procurementRequests.useQuery(undefined, { enabled: isAdmin, retry: false });
  const orders = trpc.admin.orders.useQuery(undefined, { enabled: isAdmin, retry: false });
  const quotations = trpc.admin.quotations.useQuery(undefined, { enabled: isAdmin, retry: false });
  const quoteDetail = trpc.admin.quotationDetail.useQuery({ quotationId: selectedQuoteId ?? 1 }, { enabled: isAdmin && selectedQuoteId !== null, retry: false });
  const revisions = trpc.admin.quotationRevisions.useQuery({ quotationId: selectedQuoteId ?? 1 }, { enabled: isAdmin && selectedQuoteId !== null, retry: false });
  const payments = trpc.admin.payments.useQuery(undefined, { enabled: isAdmin, retry: false });

  const resetQuoteDraft = () => {
    setQuoteCustomerId("");
    setQuoteCustomerName("");
    setQuoteValidity("14 days");
    setQuoteLeadTime("");
    setQuoteDeliveryTerms("");
    setQuoteVatRate("16");
    setQuoteLines([makeQuoteLine()]);
    setEditingQuoteId(null);
  };

  const addSupplier = trpc.admin.createSupplier.useMutation({
    onSuccess: () => {
      setSupplierName("");
      setSupplierCountry("");
      setSupplierEmail("");
      utils.admin.suppliers.invalidate();
      toast.success("Supplier profile saved privately");
    },
    onError: () => toast.error("Supplier profile could not be saved"),
  });
  const updateProcurement = trpc.admin.updateProcurementStatus.useMutation({
    onSuccess: () => {
      utils.admin.procurementRequests.invalidate();
      toast.success("Procurement workflow updated");
    },
    onError: () => toast.error("Could not update procurement status"),
  });
  const updateDelivery = trpc.admin.updateDelivery.useMutation({
    onSuccess: () => {
      utils.admin.orders.invalidate();
      setDeliveryOrder("");
      toast.success("Delivery status updated");
    },
    onError: () => toast.error("Could not update delivery status"),
  });
  const createQuote = trpc.admin.createQuoteDraft.useMutation({
    onSuccess: (quote) => {
      resetQuoteDraft();
      utils.admin.quotations.invalidate();
      setSelectedQuoteId(quote.id || null);
      if (quote.id) {
        utils.admin.quotationDetail.invalidate({ quotationId: quote.id });
        utils.admin.quotationRevisions.invalidate({ quotationId: quote.id });
      }
      toast.success(`Quotation ${quote.reference} created with immutable revision ${"revisionNumber" in quote ? quote.revisionNumber : 1}`);
    },
    onError: (error) => toast.error(error.message || "Could not create quotation draft"),
  });
  const updateQuote = trpc.admin.updateQuoteDraft.useMutation({
    onSuccess: (quote) => {
      resetQuoteDraft();
      utils.admin.quotations.invalidate();
      if (quote.id) {
        setSelectedQuoteId(quote.id);
        utils.admin.quotationDetail.invalidate({ quotationId: quote.id });
        utils.admin.quotationRevisions.invalidate({ quotationId: quote.id });
      }
      toast.success(`Quotation ${quote.reference} saved as immutable revision ${"revisionNumber" in quote ? quote.revisionNumber : "pending"}`);
    },
    onError: (error) => toast.error(error.message || "Could not save the quotation revision"),
  });
  const payment = trpc.admin.recordPayment.useMutation({
    onSuccess: () => {
      setPaymentOrder("");
      setPaymentAmount("");
      utils.admin.payments.invalidate();
      toast.success("Payment record saved for reconciliation");
    },
    onError: () => toast.error("Could not record payment"),
  });
  const reconcilePayment = trpc.admin.updatePaymentStatus.useMutation({
    onSuccess: () => {
      utils.admin.payments.invalidate();
      toast.success("Payment reconciliation status updated");
    },
    onError: () => toast.error("Could not update payment status"),
  });
  const updateQuoteLine = (id: string, field: Exclude<keyof QuoteLineForm, "id">, value: string) => {
    setQuoteLines((current) => current.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
  };

  const beginQuoteEdit = () => {
    if (!selectedQuoteId || !quoteDetail.data) {
      toast.error("Select a stored quotation and wait for its private details to load.");
      return;
    }
    const { quote, items } = quoteDetail.data;
    setEditingQuoteId(selectedQuoteId);
    setQuoteCustomerId(String(quote.customerId));
    setQuoteCustomerName(quote.customerName);
    setQuoteValidity(quote.validityNote);
    setQuoteLeadTime(quote.leadTime ?? "");
    setQuoteDeliveryTerms(quote.deliveryNote ?? "");
    setQuoteVatRate((Number(quote.vat) / Number(quote.subtotal || 1) * 100).toFixed(2).replace(/\.00$/, ""));
    setQuoteLines(items.map((item: any) => {
      const cost = item.privateCostSnapshot as { supplierCost: number; freight: number; clearing: number; localDelivery: number; marginRate: number };
      return {
        id: makeQuoteLine().id,
        description: item.description,
        partNumber: item.partNumber ?? "",
        quantity: String(item.quantity),
        supplierCost: String(cost.supplierCost),
        freight: String(cost.freight),
        clearing: String(cost.clearing),
        localDelivery: String(cost.localDelivery),
        marginPercent: String(Number(cost.marginRate) * 100),
      };
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitQuoteDraft = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const customerId = numberValue(quoteCustomerId);
    const vatRatePercent = numberValue(quoteVatRate);
    const headerValues = [quoteCustomerName, quoteValidity, quoteLeadTime, quoteDeliveryTerms];
    if (!Number.isInteger(customerId) || customerId <= 0 || !headerValues.every((value) => value.trim().length >= 2)) {
      toast.error("Enter a valid customer account ID and all customer-facing commercial terms.");
      return;
    }
    if (!Number.isFinite(vatRatePercent) || vatRatePercent < 0 || vatRatePercent > 100) {
      toast.error("VAT must be a percentage from 0 to 100.");
      return;
    }
    if (quoteLines.some((line) => line.description.trim().length < 2 || !hasValidPricing(line, vatRatePercent))) {
      toast.error("Every line needs a description, quantity, and positive supplier, freight, clearing, delivery, and margin values.");
      return;
    }
    const quoteInput = {
      customerId,
      customerName: quoteCustomerName.trim(),
      validityNote: quoteValidity.trim(),
      leadTime: quoteLeadTime.trim(),
      deliveryNote: quoteDeliveryTerms.trim(),
      vatRate: vatRatePercent / 100,
      items: quoteLines.map((line) => {
        const preview = quoteLinePreview(line, vatRatePercent);
        if (!preview) throw new Error("A valid quotation preview is required before saving.");
        return {
          description: line.description.trim(),
          partNumber: line.partNumber.trim() || undefined,
          quantity: numberValue(line.quantity),
          // Unit price is derived from the private landed cost and margin before the document-level VAT is applied.
          unitPrice: Number(preview.unitPriceBeforeVat.toFixed(2)),
          privateCostSnapshot: {
            supplierCost: numberValue(line.supplierCost),
            freight: numberValue(line.freight),
            clearing: numberValue(line.clearing),
            localDelivery: numberValue(line.localDelivery),
            marginRate: numberValue(line.marginPercent) / 100,
          },
        };
      }),
    };
    if (editingQuoteId) updateQuote.mutate({ quotationId: editingQuoteId, ...quoteInput });
    else createQuote.mutate(quoteInput);
  };

  if (!loading && !isAuthenticated) {
    return <main className="admin-gate"><LockKeyhole size={30} /><h1>Private Lunivix operations.</h1><p>Supplier profiles, cost structures, procurement workflow and quote revisions are accessible only to authorised Lunivix administrators.</p><Button onClick={() => startLogin()}>Sign in securely</Button></main>;
  }
  if (!loading && !isAdmin) {
    return <main className="admin-gate"><LockKeyhole size={30} /><h1>Administrator access required.</h1><p>Your account is authenticated but is not assigned the Lunivix administrator role.</p></main>;
  }

  return (
    <main className="admin-page">
      <aside>
        <span className="eyebrow">Lunivix private</span>
        <h1>Operations<br />workspace</h1>
        <p>Supplier cost, margin and procurement information stays inside this administrator-only environment.</p>
        <nav className="admin-nav">
          {(["overview", "suppliers", "procurement", "quotes", "fulfilment"] as Tab[]).map((item) => (
            <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "fulfilment" ? "Orders & delivery" : item}</button>
          ))}
        </nav>
      </aside>
      <section>
        <div className="admin-top">
          <div>
            <span className="eyebrow plain">{tab === "overview" ? "Overview" : `Private ${tab}`}</span>
            <h2>{tab === "overview" ? `Good to see you, ${user?.name ?? "administrator"}.` : tab === "suppliers" ? "Supplier management" : tab === "procurement" ? "Procurement workflow" : tab === "quotes" ? "Quotations & revisions" : "Orders & delivery"}</h2>
          </div>
          <span className="secure-label"><LockKeyhole size={13} /> Private cost controls active</span>
        </div>

        {tab === "overview" && <>
          <div className="metric-grid">{metrics.map(({ label, icon: Icon }) => <article key={label}><Icon size={20} /><span>{label}</span><strong>{label === "Catalogue insight" ? "Lost searches" : "—"}</strong></article>)}</div>
          <div className="lost-search-panel"><div><span className="eyebrow plain">Catalogue intelligence</span><h3>Products customers are searching for</h3><p>Unmatched searches indicate sourcing opportunities. These records are private to the Lunivix team.</p></div><div className="lost-search-list">{lostSearches.isLoading ? <span>Loading search intelligence…</span> : lostSearches.data?.length ? lostSearches.data.map((item: any) => <div key={item.query}><strong>{item.query}</strong><span>{item.occurrences} searches</span></div>) : <span>No lost-search records yet. Catalogue searches will appear here once customers start looking.</span>}</div></div>
        </>}

        {tab === "suppliers" && <div className="management-grid"><form className="ops-form" onSubmit={(event) => { event.preventDefault(); addSupplier.mutate({ supplierName, country: supplierCountry || undefined, contactEmail: supplierEmail || undefined }); }}><span className="eyebrow plain">Add trusted supplier</span><h3>Private supplier profile</h3><p>Supplier contacts, lead times and performance notes remain unavailable to customers.</p><Input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="Supplier or manufacturer name" required /><Input value={supplierCountry} onChange={(event) => setSupplierCountry(event.target.value)} placeholder="Country" /><Input value={supplierEmail} onChange={(event) => setSupplierEmail(event.target.value)} placeholder="Contact email" type="email" /><Button type="submit" disabled={addSupplier.isPending}><Plus size={16} /> Save supplier</Button></form><div className="ops-list"><div className="ops-list-title"><h3>Current suppliers</h3><button onClick={() => suppliers.refetch()}><RefreshCw size={15} /> Refresh</button></div>{suppliers.isLoading ? <p>Loading private supplier records…</p> : suppliers.data?.length ? suppliers.data.map((supplier: any) => <article key={supplier.id}><strong>{supplier.supplierName}</strong><span>{supplier.country ?? "Country not specified"}</span><small>{supplier.contactEmail ?? "No contact email"}</small></article>) : <p>No supplier profiles entered yet.</p>}</div></div>}

        {tab === "procurement" && <div className="ops-list workflow-list"><div className="ops-list-title"><h3>Incoming sourcing requests</h3><button onClick={() => procurement.refetch()}><RefreshCw size={15} /> Refresh</button></div>{procurement.isLoading ? <p>Loading procurement requests…</p> : procurement.data?.length ? procurement.data.map((request: any) => <article key={request.id}><div><strong>{request.reference}</strong><span>{request.description}</span><small>{request.partNumber ?? request.equipmentType ?? "General procurement requirement"}</small></div><select value={request.status} onChange={(event) => updateProcurement.mutate({ id: request.id, status: event.target.value as (typeof statuses)[number] })}>{statuses.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</select></article>) : <p>No procurement submissions yet. Customer requests submitted from the public flow will arrive here.</p>}</div>}

        {tab === "quotes" && <>
          <div className="quote-workspace">
            <form className="ops-form quote-draft-form" onSubmit={submitQuoteDraft}>
              <span className="eyebrow plain">{editingQuoteId ? "Commercial-term update" : "Quotation draft"}</span>
              <h3>{editingQuoteId ? "Save a new immutable revision" : "Create a controlled quote"}</h3>
              <p>{editingQuoteId ? "The current quote terms were loaded privately. Saving creates a new PDF and immutable snapshot; previous revisions are never overwritten." : "Commercial terms are customer-visible. Supplier costs, logistics components and margin remain inside this administrator-only draft until the revision is saved."}</p>
              <div className="quote-header-grid">
                <Input value={quoteCustomerId} onChange={(event) => setQuoteCustomerId(event.target.value)} placeholder="Customer account ID" type="number" min="1" required />
                <Input value={quoteCustomerName} onChange={(event) => setQuoteCustomerName(event.target.value)} placeholder="Customer name" required />
                <Input value={quoteValidity} onChange={(event) => setQuoteValidity(event.target.value)} placeholder="Validity (e.g. 14 days)" required />
                <Input value={quoteLeadTime} onChange={(event) => setQuoteLeadTime(event.target.value)} placeholder="Lead time" required />
                <Input value={quoteDeliveryTerms} onChange={(event) => setQuoteDeliveryTerms(event.target.value)} placeholder="Delivery terms" required />
                <Input value={quoteVatRate} onChange={(event) => setQuoteVatRate(event.target.value)} placeholder="VAT rate (%)" type="number" min="0" max="100" step="0.01" required />
              </div>
              <div className="quote-lines-heading"><div><strong>Line items</strong><span>Remove only before this draft is saved. Saved revisions are immutable.</span></div><Button type="button" variant="outline" onClick={() => setQuoteLines((current) => [...current, makeQuoteLine()])}><Plus size={15} /> Add line</Button></div>
              <div className="quote-lines">
                {quoteLines.map((line, index) => {
                  const preview = quoteLinePreview(line, numberValue(quoteVatRate));
                  return <article className="quote-line-editor" key={line.id}>
                    <div className="quote-line-title"><strong>Line {index + 1}</strong>{quoteLines.length > 1 && <button type="button" className="remove-line" onClick={() => setQuoteLines((current) => current.filter((item) => item.id !== line.id))}><X size={14} /> Remove</button>}</div>
                    <div className="quote-line-fields">
                      <Input value={line.description} onChange={(event) => updateQuoteLine(line.id, "description", event.target.value)} placeholder="Description" required />
                      <Input value={line.partNumber} onChange={(event) => updateQuoteLine(line.id, "partNumber", event.target.value)} placeholder="Part number / SKU (optional)" />
                      <Input value={line.quantity} onChange={(event) => updateQuoteLine(line.id, "quantity", event.target.value)} placeholder="Quantity" type="number" min="1" step="1" required />
                      <Input value={line.supplierCost} onChange={(event) => updateQuoteLine(line.id, "supplierCost", event.target.value)} placeholder="Supplier cost (KSh)" type="number" min="0.01" step="0.01" required />
                      <Input value={line.freight} onChange={(event) => updateQuoteLine(line.id, "freight", event.target.value)} placeholder="Freight (KSh)" type="number" min="0.01" step="0.01" required />
                      <Input value={line.clearing} onChange={(event) => updateQuoteLine(line.id, "clearing", event.target.value)} placeholder="Clearing (KSh)" type="number" min="0.01" step="0.01" required />
                      <Input value={line.localDelivery} onChange={(event) => updateQuoteLine(line.id, "localDelivery", event.target.value)} placeholder="Local delivery (KSh)" type="number" min="0.01" step="0.01" required />
                      <Input value={line.marginPercent} onChange={(event) => updateQuoteLine(line.id, "marginPercent", event.target.value)} placeholder="Margin (%)" type="number" min="0.01" max="100" step="0.01" required />
                    </div>
                    <div className="quote-line-preview" aria-live="polite">
                      {preview ? <><span>Private landed cost: <strong>{formatKsh(preview.landedCost)}</strong></span><span>Customer unit price before VAT: <strong>{formatKsh(preview.unitPriceBeforeVat)}</strong></span><span>Customer line total incl. VAT: <strong>{formatKsh(preview.lineTotalWithVat)}</strong></span></> : <span>Complete all required private inputs to calculate the customer price.</span>}
                    </div>
                  </article>;
                })}
              </div>
              <div className="quote-submit-actions"><Button type="submit" disabled={createQuote.isPending || updateQuote.isPending}><FileText size={16} /> {createQuote.isPending || updateQuote.isPending ? "Saving revision…" : editingQuoteId ? "Save new immutable revision" : "Save quotation draft"}</Button>{editingQuoteId && <Button type="button" variant="outline" onClick={resetQuoteDraft}>Cancel edit</Button>}</div>
            </form>
            <div className="ops-list quote-records"><div className="ops-list-title"><h3>Stored quotations</h3><button onClick={() => quotations.refetch()}><RefreshCw size={15} /> Refresh</button></div>{quotations.isLoading ? <p>Loading quotations…</p> : quotations.data?.length ? quotations.data.map((quote: any) => <button type="button" className={selectedQuoteId === quote.id ? "quote-record selected" : "quote-record"} key={quote.id} onClick={() => { setSelectedQuoteId(quote.id); if (editingQuoteId !== quote.id) resetQuoteDraft(); }}><strong>{quote.reference}</strong><span>{quote.customerName} · {quote.status}</span><small>KSh {Number(quote.total).toLocaleString()}</small></button>) : <p>No quotation drafts yet.</p>}</div>
          </div>
          <div className="revision-workspace"><div><span className="eyebrow plain">Revision discipline</span><h3>Auditable quote documents</h3><p>Editing a stored quotation loads its private commercial terms. Saving changes produces the next server-assigned revision and PDF; earlier revision snapshots remain read-only.</p>{selectedQuoteId ? <Button onClick={beginQuoteEdit} disabled={quoteDetail.isLoading || editingQuoteId !== null}><FileText size={16} /> {quoteDetail.isLoading ? "Loading private terms…" : editingQuoteId ? "Editing selected quotation" : "Edit terms & create revision"}</Button> : <p className="muted-note">Select a quotation to view its audit history or create a new revision.</p>}</div><div className="ops-list"><div className="ops-list-title"><h3>Revision history</h3>{selectedQuoteId && <button onClick={() => revisions.refetch()}><RefreshCw size={15} /> Refresh</button>}</div>{!selectedQuoteId ? <p>Select a quotation to view its audit history.</p> : revisions.isLoading ? <p>Loading revision history…</p> : revisions.data?.length ? revisions.data.map((revision: any) => <article key={revision.id}><strong>Revision {revision.revisionNumber}</strong><span>{revision.publicNote ?? "Generated commercial quote document"}</span><small>{new Date(revision.createdAt).toLocaleString()}</small></article>) : <p>No PDF revisions have been generated for this quotation yet.</p>}</div></div>
        </>}

        {tab === "fulfilment" && <><div className="management-grid"><form className="ops-form" onSubmit={(event) => { event.preventDefault(); updateDelivery.mutate({ orderId: Number(deliveryOrder), status: deliveryStatus }); }}><span className="eyebrow plain">Delivery update</span><h3>Update an order milestone</h3><p>Customer order trackers show status milestones while supplier costs remain private.</p><Input value={deliveryOrder} onChange={(event) => setDeliveryOrder(event.target.value)} placeholder="Order ID" type="number" required /><select value={deliveryStatus} onChange={(event) => setDeliveryStatus(event.target.value as (typeof deliveryStatuses)[number])}>{deliveryStatuses.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</select><Button type="submit" disabled={updateDelivery.isPending}><Truck size={16} /> Update delivery</Button></form><form className="ops-form" onSubmit={(event) => { event.preventDefault(); payment.mutate({ orderId: Number(paymentOrder), amount: paymentAmount, method: "mpesa" }); }}><span className="eyebrow plain">Payment reconciliation</span><h3>Record verified payment</h3><p>Payment-provider callbacks should be reconciled server-side before order fulfilment begins.</p><Input value={paymentOrder} onChange={(event) => setPaymentOrder(event.target.value)} placeholder="Order ID" type="number" required /><Input value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="Amount received (KSh)" type="number" required /><Button type="submit" disabled={payment.isPending}><FileText size={16} /> Record payment</Button></form><div className="ops-list"><div className="ops-list-title"><h3>Orders awaiting management</h3><button onClick={() => orders.refetch()}><RefreshCw size={15} /> Refresh</button></div>{orders.isLoading ? <p>Loading orders…</p> : orders.data?.length ? orders.data.map((order: any) => <article key={order.id}><strong>{order.reference}</strong><span>{order.status.replaceAll("_", " ")}</span><small>KSh {Number(order.total).toLocaleString()}</small></article>) : <p>No order records yet. Approved quotes and checkouts will be listed here.</p>}</div></div><div className="ops-list payment-history"><div className="ops-list-title"><h3>Payment reconciliation history</h3><button onClick={() => payments.refetch()}><RefreshCw size={15} /> Refresh</button></div>{payments.isLoading ? <p>Loading payment records…</p> : payments.data?.length ? payments.data.map((entry: any) => <article key={entry.id} className="payment-record"><div><strong>Order #{entry.orderId} · KSh {Number(entry.amount).toLocaleString()}</strong><span>{entry.method} · {entry.providerReference ?? "No provider reference"}</span></div><select value={entry.status} onChange={(event) => reconcilePayment.mutate({ id: entry.id, status: event.target.value as "pending" | "partially_paid" | "paid" | "refunded" | "failed" })}>{["pending", "partially_paid", "paid", "refunded", "failed"].map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</select></article>) : <p>No payment records yet. Verified payments entered above will be retained here for audit and reconciliation.</p>}</div></>}
      </section>
    </main>
  );
}
