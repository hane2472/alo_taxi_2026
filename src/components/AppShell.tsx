import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Car,
  LayoutDashboard,
  PlusCircle,
  ListOrdered,
  Users,
  UserCog,
  Wallet,
  Archive,
  History,
  LogOut,
  Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useCurrentPeriod } from "@/lib/session";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof Car };

const USER_NAV: NavItem[] = [
  { to: "/home", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/new-order", label: "إضافة طلب", icon: PlusCircle },
  { to: "/my-orders", label: "طلباتي", icon: ListOrdered },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/admin/orders", label: "الطلبات", icon: ListOrdered },
  { to: "/admin/captains", label: "الكباتن", icon: Car },
  { to: "/admin/commissions", label: "العمولات", icon: Wallet },
  { to: "/admin/users", label: "المستخدمون", icon: Users },
  { to: "/admin/archive", label: "أرشيف الدورات", icon: Archive },
  { to: "/admin/activity", label: "سجل النشاط", icon: History },
];

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const { data: profile } = useProfile();
  const { data: period } = useCurrentPeriod();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = profile?.role === "admin" ? ADMIN_NAV : USER_NAV;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
      <button
        onClick={signOut}
        className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-destructive/15 hover:text-destructive"
      >
        <LogOut className="size-4 shrink-0" />
        تسجيل الخروج
      </button>
    </nav>
  );

  const brand = (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
        <Car className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-sidebar-foreground">ألو تكسي</p>
        <p className="truncate text-[11px] text-sidebar-foreground/60">
          {period?.name ?? "لا توجد دورة مفتوحة"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-l border-sidebar-border bg-sidebar p-4 lg:flex">
        {brand}
        {nav}
        <div className="mt-auto rounded-lg bg-sidebar-accent/60 p-3">
          <p className="truncate text-xs font-semibold text-sidebar-foreground">{profile?.full_name}</p>
          <p className="text-[11px] text-sidebar-foreground/60">
            {profile?.role === "admin" ? "مدير" : "موظف"}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur lg:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="القائمة">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-sidebar-border bg-sidebar p-4">
              <SheetTitle className="sr-only">القائمة</SheetTitle>
              {brand}
              {nav}
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold lg:text-lg">{title}</h1>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
