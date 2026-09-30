import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { getOptionalUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "RAHMET CRM",
  description: "Akademi ve kurs yönetimi",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getOptionalUser();
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full bg-muted/30 text-foreground">
        <AppShell user={user}>{children}</AppShell>
        <Toaster richColors />
      </body>
    </html>
  );
}
