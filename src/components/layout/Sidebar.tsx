import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FlaskConical, Database, Brain, Cog,
  Waves, Shield, Dices, TrendingUp, BarChart3, Rocket, Settings,
  ChevronLeft, ChevronRight, Monitor, Menu, X, LogOut,
  Radio, Briefcase, Activity
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import onex from "@/assets/one.png";
const navSections = [
  {
    label: "Trading",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      { label: "Terminal", path: "/terminal", icon: Monitor },
      { label: "Signals", path: "/strategy", icon: Radio },
      { label: "Research", path: "/research", icon: FlaskConical },
    ],
  },
  {
    label: "Analysis",
    items: [
      { label: "Data Lab", path: "/data-lab", icon: Database },
      { label: "Backtest", path: "/backtest", icon: Cog },
      { label: "Regime", path: "/regime", icon: Waves },
    ],
  },
  {
    label: "Advanced",
    items: [
      { label: "Robustness", path: "/robustness", icon: Shield },
      { label: "Monte Carlo", path: "/monte-carlo", icon: Dices },
      { label: "Optimization", path: "/optimization", icon: TrendingUp },
      { label: "Results", path: "/results", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Export", path: "/export", icon: Rocket },
      { label: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();

  const sidebarWidth = isMobile ? "w-[260px]" : collapsed ? "w-14" : "w-52";
  const showLabels = isMobile ? true : !collapsed;

  return (
    <>
      {/* Mobile hamburger */}
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-2.5 left-2.5 z-[60] w-10 h-10 bg-card/80 backdrop-blur-sm border border-border rounded-sm flex items-center justify-center text-foreground active:bg-secondary"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Overlay */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[55]" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-[60] transition-all duration-200 ${sidebarWidth} ${
          isMobile ? (mobileOpen ? "translate-x-0" : "-translate-x-full") : ""
        }`}
      >
        {/* Logo */}
        <div className="h-12 flex items-center justify-between px-3 border-b border-sidebar-border shrink-0">
          <img src={onex} alt="OneX" className="lg:w-full w-36" />
          {isMobile && (
            <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.label} className="mb-2">
              {showLabels && (
                <span className="px-4 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                  {section.label}
                </span>
              )}
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path + item.label}
                    to={item.path}
                    onClick={() => isMobile && setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 mx-1.5 mb-0.5 text-[13px] transition-colors rounded-sm ${
                      isActive
                        ? "bg-sidebar-accent text-primary font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {showLabels && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="flex items-center gap-2.5 px-3 py-2.5 mx-1.5 mb-1 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive rounded-sm transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {showLabels && <span>Sign Out</span>}
        </button>

        {/* Collapse toggle (desktop only) */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="h-9 flex items-center justify-center border-t border-sidebar-border text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </aside>
    </>
  );
}
