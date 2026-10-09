import Link from "next/link";
import { AcademyType, Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const academies: { type: AcademyType; slug: string; name: string; description: string }[] = [
  { type: "PRIMARY", slug: "ilkokul", name: "İlkokul Akademi", description: "İlkokul öğrencilerinin akademi kayıtları" },
  { type: "MIDDLE", slug: "ortaokul", name: "Ortaokul Akademi", description: "Ortaokul öğrencilerinin akademi kayıtları" },
  { type: "HIGH", slug: "lise", name: "Lise Akademi", description: "Lise öğrencilerinin akademi kayıtları" },
];

export default async function AcademiesPage() {
  const groups = await db.academyEnrollment.groupBy({ by: ["academy"], where: { isActive: true }, _count: { _all: true }, _sum: { feeAmount: true } });
  const summary = new Map(groups.map((group) => [group.academy, group]));
  return <div className="space-y-6"><PageHeader title="Akademiler" description="Öğrenci, veli ve toplam akademi ücretini ders bazına ayırmadan yönetin." /><div className="grid gap-4 md:grid-cols-3">{academies.map((academy) => { const group = summary.get(academy.type); return <Card key={academy.type}><CardHeader><CardTitle>{academy.name}</CardTitle><p className="text-sm text-muted-foreground">{academy.description}</p></CardHeader><CardContent className="space-y-4"><div><p className="text-sm text-muted-foreground">Aktif öğrenci</p><p className="text-2xl font-semibold">{group?._count._all ?? 0}</p></div><div><p className="text-sm text-muted-foreground">Toplam kayıt ücreti</p><p className="font-medium">{formatMoney(group?._sum.feeAmount ?? new Prisma.Decimal(0))}</p></div><Button className="w-full" render={<Link href={`/akademiler/${academy.slug}`} />}>Akademiyi aç</Button></CardContent></Card>; })}</div></div>;
}
