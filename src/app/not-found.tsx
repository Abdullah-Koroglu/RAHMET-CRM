import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return <Card className="mx-auto max-w-lg"><CardHeader><CardTitle>Kayıt bulunamadı</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">İstenen sayfa silinmiş, taşınmış veya erişiminiz dışında olabilir.</p><Link href="/" className={buttonVariants()}>Genel görünüme dön</Link></CardContent></Card>;
}
