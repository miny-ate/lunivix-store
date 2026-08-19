import { FileText, Heart, Package, ReceiptText, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";

const accountCards = [{ icon: Package, title: "Orders & delivery", description: "Track current orders from payment confirmation to delivery.", href: "/orders" }, { icon: FileText, title: "Quotations", description: "View professional quote PDFs and retained revision history." }, { icon: ReceiptText, title: "Invoices & payments", description: "Review payment status and invoice records securely." }, { icon: Heart, title: "Saved products", description: "Return to your shortlisted parts and equipment quickly." }];

export default function Account() {
  const { user, isAuthenticated, loading } = useAuth();
  return <main className="account-page"><div className="account-panel"><span className="eyebrow plain">Customer account</span><h1>Your commercial<br /><em>purchasing desk.</em></h1><p>Keep quotes, orders, procurement requests, payment status and saved products in one secure place.</p>{!loading && !isAuthenticated ? <Button onClick={() => startLogin()}>Sign in to Lunivix <ShieldCheck size={16} /></Button> : <div className="account-welcome">Welcome back, <strong>{user?.name ?? "Lunivix customer"}</strong>. Your secure account workspace is ready.</div>}</div><div className="account-grid">{accountCards.map(({ icon: Icon, title, description, href }) => href ? <Link href={href} key={title}><article><Icon size={23} /><h2>{title}</h2><p>{description}</p><span>Open secure tracker</span></article></Link> : <article key={title}><Icon size={23} /><h2>{title}</h2><p>{description}</p><span>Available after sign-in</span></article>)}</div></main>;
}
