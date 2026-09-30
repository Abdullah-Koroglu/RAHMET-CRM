import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export default async function ForbiddenPage() {
  await getCurrentUser();
  return <Card className="mx-auto max-w-lg"><CardHeader><CardTitle>Bu işlem için yetkiniz yok</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Gerekli rol için sistem yöneticinizle iletişime geçin.</p><Link href="/" className={buttonVariants()}>Genel görünüme dön</Link></CardContent></Card>;
}
