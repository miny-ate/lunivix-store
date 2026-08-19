import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Catalogue from "@/pages/Catalogue";
import ProductDetail from "@/pages/ProductDetail";
import Account from "@/pages/Account";
import Admin from "@/pages/Admin";
import OrderTracking from "@/pages/OrderTracking";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/equipment" component={() => <Catalogue type="equipment" />} />
      <Route path="/spare-parts" component={() => <Catalogue type="spare_part" />} />
      <Route path="/product/:sku" component={ProductDetail} />
      <Route path="/account" component={Account} />
      <Route path="/admin" component={Admin} />
      <Route path="/orders" component={OrderTracking} />
      <Route path="/procurement" component={Home} />
      <Route path="/find-a-part" component={Home} />
      <Route path="/quick-order" component={Home} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Router />
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
