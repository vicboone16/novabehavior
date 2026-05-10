import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Menu, X } from "lucide-react";

export const WelcomeNav = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/welcome", label: "Overview" },
    { to: "/welcome/features", label: "Features" },
    { to: "/welcome/add-ons", label: "Add-ons" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-xs">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/welcome" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-xl text-foreground">NovaTrack</span>
            <span className="text-[10px] font-bold text-sidebar-primary uppercase tracking-widest">Behavior</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-medium transition-colors ${
                location.pathname === l.to
                  ? "text-sidebar-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link to="/demo">
            <Button variant="outline" size="sm">Book Demo</Button>
          </Link>
          <Link to="/auth">
            <Button size="sm" className="bg-sidebar-primary hover:bg-sidebar-primary/90 text-white">
              Get Started
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden p-2 rounded-md text-muted-foreground"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-white px-6 py-4 flex flex-col gap-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-foreground py-1"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            <Link to="/auth" onClick={() => setOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">Sign In</Button>
            </Link>
            <Link to="/auth" onClick={() => setOpen(false)}>
              <Button size="sm" className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
