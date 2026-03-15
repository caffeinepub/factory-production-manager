import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  BarChart3,
  CalendarCheck,
  ClipboardList,
  Database,
  Factory,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAdminAuth } from "./hooks/useAdminAuth";
import { seedDemoData } from "./store";

import Attendance from "./pages/Attendance";
import Dashboard from "./pages/Dashboard";
import DataManagement from "./pages/DataManagement";
import Employees from "./pages/Employees";
import Inventory from "./pages/Inventory";
import LoginPage from "./pages/LoginPage";
import Operations from "./pages/Operations";
import ProductionEntry from "./pages/ProductionEntry";
import Reports from "./pages/Reports";

type Page =
  | "dashboard"
  | "employees"
  | "operations"
  | "attendance"
  | "production"
  | "reports"
  | "inventory"
  | "datamanagement";

const NAV_ITEMS: {
  id: Page;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ocid: string;
}[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    ocid: "nav.dashboard.link",
  },
  {
    id: "employees",
    label: "Employees",
    icon: Users,
    ocid: "nav.employees.link",
  },
  {
    id: "operations",
    label: "Operations",
    icon: Settings2,
    ocid: "nav.operations.link",
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: CalendarCheck,
    ocid: "nav.attendance.link",
  },
  {
    id: "production",
    label: "Production",
    icon: ClipboardList,
    ocid: "nav.production.link",
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    ocid: "nav.reports.link",
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    ocid: "nav.inventory.link",
  },
  {
    id: "datamanagement",
    label: "Data Mgmt",
    icon: Database,
    ocid: "nav.datamanagement.link",
  },
];

function PageContent({ page }: { page: Page }) {
  switch (page) {
    case "dashboard":
      return <Dashboard />;
    case "employees":
      return <Employees />;
    case "operations":
      return <Operations />;
    case "attendance":
      return <Attendance />;
    case "production":
      return <ProductionEntry />;
    case "reports":
      return <Reports />;
    case "inventory":
      return <Inventory />;
    case "datamanagement":
      return <DataManagement />;
  }
}

export default function App() {
  const { isLoggedIn, isInitializing, login, logout } = useAdminAuth();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Seed demo data on first load
  useEffect(() => {
    if (isLoggedIn) {
      seedDemoData();
    }
  }, [isLoggedIn]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Factory className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <LoginPage onLogin={login} />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* ─── Sidebar (lg+) ─── */}
      <aside className="hidden lg:flex lg:w-56 xl:w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border fixed inset-y-0 left-0 z-50">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Factory className="w-4.5 h-4.5 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-sidebar-foreground font-display font-bold text-sm leading-tight">
              Factory PM
            </div>
            <div className="text-sidebar-foreground/40 text-[10px]">
              Admin Panel
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-ocid={item.ocid}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground/50"
                  }`}
                />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            data-ocid="sidebar.logout.button"
            onClick={logout}
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 text-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* ─── Mobile sidebar overlay ─── */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSidebarOpen(false);
          }}
          role="button"
          tabIndex={-1}
          aria-label="Close sidebar"
        />
      )}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Factory className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-sidebar-foreground font-display font-bold text-sm">
                Factory PM
              </div>
              <div className="text-sidebar-foreground/40 text-[10px]">
                Admin Panel
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-ocid={item.ocid}
                onClick={() => {
                  setCurrentPage(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground/50"
                  }`}
                />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            data-ocid="mobile_sidebar.logout.button"
            onClick={logout}
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 text-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* ─── Main content ─── */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-56 xl:ml-64">
        {/* Top header (mobile) */}
        <header className="sticky top-0 z-30 bg-card border-b border-border flex items-center justify-between px-4 h-14 lg:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Factory className="w-3.5 h-3.5 text-white" strokeWidth={2} />
              </div>
              <span className="font-display font-bold text-sm">Factory PM</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground capitalize">
              {NAV_ITEMS.find((n) => n.id === currentPage)?.label}
            </span>
            <Button
              variant="ghost"
              size="sm"
              data-ocid="topbar.logout.button"
              onClick={logout}
              className="h-8 w-8 p-0 text-muted-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Top header (desktop) */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-card border-b border-border items-center justify-between px-6 h-14">
          <div>
            <h1 className="font-display font-bold text-base capitalize">
              {NAV_ITEMS.find((n) => n.id === currentPage)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              data-ocid="topbar_desktop.logout.button"
              onClick={logout}
              className="gap-1.5 text-muted-foreground text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <div className="max-w-2xl lg:max-w-none mx-auto">
            <PageContent page={currentPage} />
          </div>
          <footer className="px-4 py-3 text-center text-[11px] text-muted-foreground/50 border-t border-border/40 mt-4 hidden lg:block">
            © {new Date().getFullYear()}. Built with ♥ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              caffeine.ai
            </a>
          </footer>
        </main>

        {/* ─── Bottom tab bar (mobile) ─── */}
        <nav className="bottom-nav lg:hidden">
          <div className="grid grid-cols-8">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-ocid={item.ocid}
                  onClick={() => setCurrentPage(item.id)}
                  className={`flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive ? "text-primary" : ""}`}
                  />
                  <span className="text-[9px] font-medium leading-tight">
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  );
}
