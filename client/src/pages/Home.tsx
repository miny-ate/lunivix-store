import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowRight, BellDot, Check, ChevronRight, FileText, Heart, Menu, PackageCheck,
  Search, ShoppingBag, Sparkles, Upload, X, Zap,
} from "lucide-react";

const categoryCards = [
  { name: "Laundry", count: "Washer extractors · Dryers · Ironers", image: "/manus-storage/laundry-washer_bbe31e55.jpg", tone: "from-amber-100 to-stone-50" },
  { name: "Commercial Kitchen", count: "Cooking · Bakery · Preparation", image: "/manus-storage/commercial-kitchen_0cdbd064.jpg", tone: "from-orange-100 to-stone-50" },
  { name: "Refrigeration", count: "Controls · Compressors · Cold rooms", image: "/manus-storage/refrigeration-parts_8cfc3d95.png", tone: "from-sky-100 to-stone-50" },
  { name: "Dishwashing", count: "Pumps · Seals · Heating elements", image: "/manus-storage/refrigeration-parts_8cfc3d95.png", tone: "from-emerald-100 to-stone-50" },
];

const journeys = [
  { index: "01", title: "Buy with confidence", description: "Shop standard products with clear availability and delivery information.", action: "Shop in-stock parts", icon: ShoppingBag },
  { index: "02", title: "Request a quote", description: "For equipment, specialised parts and project-scale requirements.", action: "Start a quotation", icon: FileText },
  { index: "03", title: "Let us source it", description: "Send an RFQ, technical sheet or part photo. Our procurement team will take it from there.", action: "Request procurement", icon: BellDot },
];

function StatusPill({ availability }: { availability: string }) {
  const labels: Record<string, string> = { in_stock: "Available now", on_order: "Available on order", quote_only: "Price on request" };
  return <span className="status-pill"><span className="status-dot" />{labels[availability] ?? "Confirm availability"}</span>;
}

function AuthenticityBadge({ type }: { type: string }) {
  const labels: Record<string, string> = { genuine_oem: "Genuine OEM", compatible: "Compatible replacement", alternative: "Alternative product" };
  return <Badge className={type === "genuine_oem" ? "oem-badge" : "compatible-badge"}>{labels[type]}</Badge>;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState("all");
  const [saved, setSaved] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [quickOrder, setQuickOrder] = useState(false);
  const catalogue = trpc.catalog.list.useQuery();
  const remoteSearch = trpc.catalog.search.useQuery({ query: search || "part", source: "header" }, { enabled: search.trim().length > 2, retry: false });
  const products = catalogue.data ?? [];
  const searchedProducts = search.trim().length > 2 ? (remoteSearch.data ?? []) : products;
  const filteredProducts = useMemo(() => searchedProducts.filter((product: any) => catalogFilter === "all" || product.category === catalogFilter || product.productType === catalogFilter), [searchedProducts, catalogFilter]);

  const saveProduct = (id: string) => {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    toast.success(saved.includes(id) ? "Removed from saved products" : "Saved to your account shortlist");
  };

  const addToCart = (name: string) => {
    setCartCount((count) => count + 1);
    toast.success(`${name} added to your enquiry cart`);
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1e2420]">
      <div className="top-note">For hospitality, healthcare and commercial operations <span>•</span> Sourcing nationwide and across East Africa</div>
      <header className="site-header">
        <Link href="/" className="brand-mark" aria-label="Lunivix home"><span className="brand-orb">L</span><span>Lunivix<small>Commercial supply</small></span></Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/equipment">Equipment</Link><Link href="/spare-parts">Spare Parts</Link><a href="#procurement">Procurement</a><a href="#brands">Brands</a><a href="#about">About</a>
        </nav>
        <div className="header-actions">
          <button className="icon-action" aria-label="Search" onClick={() => document.getElementById("catalogue-search")?.focus()}><Search size={19} /></button>
          <button className="cart-action" aria-label="Enquiry cart" onClick={() => toast.info("Your secure cart is ready for checkout after sign-in.")}><ShoppingBag size={18} /><span>{cartCount}</span></button>
          <Button className="nav-cta" onClick={() => document.getElementById("procurement")?.scrollIntoView({ behavior: "smooth" })}>Request a quote <ArrowRight size={16} /></Button>
          <button className="mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>
      {menuOpen && <div className="mobile-nav"><Link href="/equipment" onClick={() => setMenuOpen(false)}>Equipment</Link><Link href="/spare-parts" onClick={() => setMenuOpen(false)}>Spare parts</Link><a href="#procurement" onClick={() => setMenuOpen(false)}>Procurement</a><Link href="/account" onClick={() => setMenuOpen(false)}>Customer account</Link><Button onClick={() => { setMenuOpen(false); document.getElementById("procurement")?.scrollIntoView({ behavior: "smooth" }); }}>Request a quote</Button></div>}

      <main>
        <section className="hero-shell">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15} /> Genuine commercial equipment & spare parts</div>
            <h1>Keep essential operations <em>moving.</em></h1>
            <p>Source, procure and purchase verified commercial equipment and genuine spare parts through a supplier that understands the work behind the work.</p>
            <div className="hero-search">
              <Search size={20} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search part number, brand, model or equipment" aria-label="Search catalogue" /><button onClick={() => document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" })}>Search <ArrowRight size={16} /></button>
            </div>
            <div className="hero-meta"><span><Check size={15} /> OEM & verified alternatives</span><span><Check size={15} /> Procurement support</span><span><Check size={15} /> Kenya & East Africa</span></div>
          </div>
          <div className="hero-visual">
            <div className="hero-grid" />
            <div className="image-panel"><img src="/manus-storage/laundry-washer_bbe31e55.jpg" alt="Commercial washer extractor" /><div className="visual-caption"><span>Featured equipment</span><strong>Built for the long run</strong></div></div>
            <div className="floating-card top-card"><span className="mini-label">Part search</span><strong>CR0684490</strong><span>Matched to 3 equipment models</span></div>
            <div className="floating-card bottom-card"><PackageCheck size={23} /><div><span className="mini-label">Current availability</span><strong>Verified before you order</strong></div></div>
          </div>
        </section>

        <section className="need-section" id="about">
          <div className="section-intro"><div><span className="eyebrow plain">A better way to buy</span><h2>What do you <em>need?</em></h2></div><p>Choose the route that fits your requirement. Shop standard products, request a specialist quotation, or hand the sourcing over to us.</p></div>
          <div className="journey-grid">{journeys.map(({ index, title, description, action, icon: Icon }) => <article className="journey-card" key={title}><span className="journey-index">{index}</span><Icon className="journey-icon" size={28} /><h3>{title}</h3><p>{description}</p><button onClick={() => document.getElementById(index === "03" ? "procurement" : "catalogue")?.scrollIntoView({ behavior: "smooth" })}>{action}<ArrowRight size={16} /></button></article>)}</div>
        </section>

        <section className="category-section" id="brands"><div className="section-header"><div><span className="eyebrow plain">Find your category</span><h2>Commercial equipment,<br /><em>properly organised.</em></h2></div><a href="#catalogue">Explore the catalogue <ArrowRight size={16} /></a></div><div className="category-grid">{categoryCards.map((category) => <article key={category.name} className={`category-card bg-gradient-to-br ${category.tone}`}><img src={category.image} alt={category.name} /><div className="category-scrim" /><div className="category-copy"><span>{category.count}</span><h3>{category.name}</h3><button onClick={() => { setCatalogFilter(category.name === "Commercial Kitchen" ? "kitchen" : category.name.toLowerCase()); document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" }); }}>Browse collection <ChevronRight size={17} /></button></div></article>)}</div></section>

        <section className="catalogue-section" id="catalogue">
          <div className="catalogue-heading"><div><span className="eyebrow plain">Selected for you</span><h2>Search by part. Buy with <em>clarity.</em></h2></div><p>Every listing indicates its authenticity, supply status and lead time before you request a quote or add it to your cart.</p></div>
          <div className="catalogue-controls"><div className="catalogue-search"><Search size={18} /><Input id="catalogue-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try CR0684490, 191144 or washer" /></div><div className="filter-row">{[["all", "All"], ["equipment", "Equipment"], ["spare_part", "Spare parts"], ["laundry", "Laundry"], ["kitchen", "Kitchen"]].map(([value, label]) => <button key={value} className={catalogFilter === value ? "filter active" : "filter"} onClick={() => setCatalogFilter(value)}>{label}</button>)}</div></div>
          {search.length > 2 && <div className="search-status">Searching exact and partial references for <strong>“{search}”</strong>{remoteSearch.isFetching && <span> · checking catalogue</span>}</div>}
          <div className="product-grid">{filteredProducts.map((product: any) => <article className="product-card" key={product.id}><div className="product-image"><img src={product.imageUrl} alt={product.name} /><button className="save-button" onClick={() => saveProduct(product.id)} aria-label="Save product"><Heart size={18} fill={saved.includes(product.id) ? "currentColor" : "none"} /></button><AuthenticityBadge type={product.authenticity} /></div><div className="product-content"><div className="product-overline"><span>{product.brand}</span><span>{product.sku}</span></div><Link href={`/product/${product.sku}`}><h3>{product.name}</h3></Link><p>{product.summary}</p><div className="product-footer"><div><StatusPill availability={product.availability} /><strong>{product.priceKsh === "quote" ? "Request quotation" : `KSh ${Number(product.priceKsh).toLocaleString()}`}</strong></div><button className="add-button" onClick={() => addToCart(product.name)} aria-label={`Add ${product.name} to enquiry cart`}><ArrowRight size={18} /></button></div></div></article>)}</div>
          {filteredProducts.length === 0 && <div className="empty-search"><Search size={25} /><h3>No exact match found yet</h3><p>We’ll record this search for our procurement team. Send a part number or photo and we will source it.</p><Button onClick={() => document.getElementById("procurement")?.scrollIntoView({ behavior: "smooth" })}>Find this part for me <ArrowRight size={16} /></Button></div>}
        </section>

        <section className="procurement-section" id="procurement"><div className="procurement-panel"><div className="procurement-copy"><span className="eyebrow">Can’t find it? We can source it.</span><h2>Procurement, without the <em>guesswork.</em></h2><p>Send your equipment schedule, RFQ, tender document or part photo. Our team will validate the requirement, source responsibly and prepare a professional Lunivix quotation.</p><div className="procurement-points"><span><Check size={16} /> Quote revisions retained</span><span><Check size={16} /> OEM / compatible clarity</span><span><Check size={16} /> Private supplier costing</span></div><Button className="light-button" onClick={() => setQuickOrder(true)}>Start a procurement request <ArrowRight size={16} /></Button></div><div className="procurement-workflow"><span className="workflow-title">From request to delivery</span>{["Tell us what you need", "We source & validate", "You receive a clear quote", "We procure & deliver"].map((item, index) => <div className="workflow-step" key={item}><span>0{index + 1}</span><p>{item}</p></div>)}</div></div></section>

        <section className="trust-strip"><div><span className="eyebrow plain">How Lunivix protects your purchase</span><h2>Commercial buying needs more<br /><em>than a checkout.</em></h2></div><div className="trust-list"><div><Zap size={22} /><span><strong>Clear supply status</strong>Know whether it is in stock, on order or quote-only.</span></div><div><FileText size={22} /><span><strong>Documented quotations</strong>Professional PDFs with revisions retained for audit.</span></div><div><PackageCheck size={22} /><span><strong>Verified relationships</strong>Only confirmed part-to-equipment compatibility is shown.</span></div></div></section>
      </main>

      <footer className="site-footer"><div className="footer-brand"><Link href="/" className="brand-mark"><span className="brand-orb">L</span><span>Lunivix<small>Commercial supply</small></span></Link><p>Genuine commercial equipment & spare parts.<br />Sales · Sourcing · Procurement.</p></div><div><h4>Shop</h4><a href="#catalogue">Equipment</a><a href="#catalogue">Spare parts</a><a href="#procurement">Request a quote</a></div><div><h4>Support</h4><a href="#procurement">Find a part</a><button onClick={() => setQuickOrder(true)}>Quick order</button><a href="#procurement">Procurement</a></div><div className="footer-note"><span>Trusted commercial sourcing</span><strong>Made for operations that cannot stop.</strong></div><small className="legal">© 2026 Lunivix Technologies Limited. All rights reserved.</small></footer>

      {quickOrder && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="quick-order-title"><div className="quick-order-modal"><button className="modal-close" aria-label="Close" onClick={() => setQuickOrder(false)}><X size={20} /></button><span className="eyebrow plain">Quick order & procurement</span><h2 id="quick-order-title">Send your requirement.</h2><p>For bulk orders, RFQs and technical specifications. Upload support is already modelled securely and will be activated with your production storage configuration.</p><div className="quick-grid"><Input placeholder="Part number / SKU" /><Input placeholder="Quantity" /><Input className="wide" placeholder="Description, model or procurement requirement" /></div><button className="upload-zone" onClick={() => toast.info("Secure document upload will be enabled with your S3 storage configuration.")}><Upload size={20} /><span><strong>Attach RFQ, CSV, Excel or photographs</strong>PDF, XLSX, CSV, JPG or PNG</span></button><Button className="modal-submit" onClick={() => { setQuickOrder(false); toast.success("Your request form is ready for secure submission after sign-in."); }}>Continue to secure request <ArrowRight size={16} /></Button></div></div>}
    </div>
  );
}
