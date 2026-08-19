import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";

export default function Catalogue({ type }: { type: "equipment" | "spare_part" }) {
  const [query, setQuery] = useState("");
  const list = trpc.catalog.list.useQuery();
  const search = trpc.catalog.search.useQuery({ query: query || "part", source: "catalog" }, { enabled: query.length > 2, retry: false });
  const products = useMemo(() => (query.length > 2 ? (search.data ?? []) : (list.data ?? [])).filter((product: any) => product.productType === type), [list.data, query, search.data, type]);
  const title = type === "equipment" ? "Commercial equipment" : "Genuine spare parts";
  return <main className="catalogue-page"><header className="inner-header"><Link href="/" className="brand-mark"><span className="brand-orb">L</span><span>Lunivix<small>Commercial supply</small></span></Link><Link href="/" className="back-home"><ArrowLeft size={16} /> Back to Lunivix</Link></header><section className="catalogue-page-hero"><span className="eyebrow plain">Lunivix catalogue</span><h1>{title},<br /><em>without the uncertainty.</em></h1><p>Search exact part references, verified OEM and compatible options, or browse by the operational category you need to keep moving.</p><div className="catalogue-search page-search"><Search size={18} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search part number, brand, model or description" /></div></section><section className="catalogue-page-results"><div className="result-bar"><span>{products.length} matched products</span><button><SlidersHorizontal size={15} /> Filter catalogue</button></div><div className="product-grid">{products.map((product: any) => <Link href={`/product/${product.sku}`} key={product.id} className="product-card"><div className="product-image"><img src={product.imageUrl} alt={product.name} /><span className={product.authenticity === "genuine_oem" ? "oem-badge" : "compatible-badge"}>{product.authenticity === "genuine_oem" ? "Genuine OEM" : product.authenticity === "compatible" ? "Compatible replacement" : "Alternative product"}</span></div><div className="product-content"><div className="product-overline"><span>{product.brand}</span><span>{product.sku}</span></div><h3>{product.name}</h3><p>{product.summary}</p><div className="catalogue-card-end"><span>{product.availability === "in_stock" ? "Available now" : product.availability === "on_order" ? "Available on order" : "Price on request"}</span><ArrowRight size={16} /></div></div></Link>)}</div></section></main>;
}
