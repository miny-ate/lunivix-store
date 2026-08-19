import { Link } from "wouter";
import { ArrowLeft, MapPin, PackageCheck, Truck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

const stages = ["Order received", "Payment confirmed", "Procurement", "Supplier processing", "Shipped", "In transit", "Delivered"];

export default function OrderTracking() {
  const { isAuthenticated, loading } = useAuth();
  const orders = trpc.account.orders.useQuery(undefined, { enabled: isAuthenticated });
  if (!loading && !isAuthenticated) return <main className="tracking-gate"><PackageCheck size={30} /><h1>Track orders in your secure account.</h1><p>Sign in to see your procurement status, payments, delivery milestones and past commercial purchases.</p><Button onClick={() => startLogin()}>Sign in to track orders</Button></main>;
  return <main className="tracking-page"><header className="inner-header"><Link href="/" className="brand-mark"><span className="brand-orb">L</span><span>Lunivix<small>Commercial supply</small></span></Link><Link href="/account" className="back-home"><ArrowLeft size={16} /> Back to account</Link></header><section><span className="eyebrow plain">Order tracking</span><h1>Every delivery,<br /><em>in view.</em></h1><p>Follow your commercial order from confirmation to final delivery. Supplier costs and private procurement activity remain internal to Lunivix.</p>{orders.isLoading ? <div className="tracking-empty">Loading your order history…</div> : orders.data?.length ? <div className="order-list">{orders.data.map((order: any) => <article key={order.id}><div><span>{order.reference}</span><h2>{order.status.replaceAll("_", " ")}</h2></div><div className="stage-row">{stages.map((stage) => <span key={stage} className={order.status.replaceAll("_", " ") === stage.toLowerCase() ? "current" : ""}>{stage}</span>)}</div><div className="order-meta"><span><Truck size={16} /> KSh {Number(order.total).toLocaleString()}</span><span><MapPin size={16} /> Delivery details available in order record</span></div></article>)}</div> : <div className="tracking-empty"><PackageCheck size={25} /><h2>No orders to track yet.</h2><p>When you place an order or approve a quotation, its delivery milestones will appear here.</p><Link href="/equipment"><Button>Explore equipment</Button></Link></div>}</section></main>;
}
