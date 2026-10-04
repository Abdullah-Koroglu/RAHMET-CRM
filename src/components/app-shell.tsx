"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, CalendarRange, GraduationCap, LayoutDashboard, LogOut, School, ShieldCheck, UsersRound, WalletCards } from "lucide-react";
import { logoutAction } from "@/app/auth-actions";
import { SessionHeartbeat } from "@/components/session-heartbeat";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Genel görünüm", icon: LayoutDashboard },
  { href: "/dersler", label: "Dersler", icon: BookOpen },
  { href: "/on-kayitlar", label: "Ön kayıtlar", icon: UsersRound },
  { href: "/ogrenciler", label: "Öğrenciler", icon: GraduationCap },
  { href: "/tahsilatlar", label: "Tahsilatlar", icon: WalletCards },
  { href: "/ogretmenler", label: "Öğretmenler", icon: School },
  { href: "/akademik-yillar", label: "Akademik yıllar", icon: CalendarRange },
  { href: "/entegrasyonlar", label: "Entegrasyonlar", icon: Activity, adminOnly: true },
  { href: "/kullanicilar", label: "Kullanıcılar", icon: ShieldCheck, adminOnly: true },
];

export function AppShell({ children, user }: { children: React.ReactNode; user: CurrentUser | null }) {
  const pathname = usePathname();
  if (pathname === "/login") return children;
  const visibleNav = nav.filter((item) => !item.adminOnly || user?.role === "ADMIN");
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <SessionHeartbeat />
      <aside className="border-b bg-background lg:flex lg:min-h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-3 px-5"><div className="grid size-9 place-items-center rounded-lg bg-primary font-semibold text-primary-foreground">R</div><div><p className="font-semibold">RAHMET CRM</p><p className="text-xs text-muted-foreground">Akademi yönetimi</p></div></div>
        <Separator />
        <nav aria-label="Ana menü" className="flex gap-1 overflow-x-auto p-3 lg:flex-col">
          {visibleNav.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn(buttonVariants({ variant: active ? "secondary" : "ghost", className: "justify-start" }))}><Icon className="size-4" aria-hidden="true" />{label}</Link>;
          })}
        </nav>
        {user ? <div className="border-t p-3 text-sm lg:mt-auto"><p className="truncate font-medium">{user.displayName}</p><p className="truncate text-xs text-muted-foreground">{user.role}</p><form action={logoutAction} className="mt-2"><Button type="submit" variant="outline" size="sm"><LogOut aria-hidden="true" />Çıkış</Button></form></div> : null}
      </aside>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
