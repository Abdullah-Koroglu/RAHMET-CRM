import Link from "next/link";
import { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  await getCurrentUser();
  const students = await db.student.findMany({ where: { isActive: true }, include: { enrollments: { where: { status: "ACTIVE" } }, accountEntries: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] });
  const rows = students.map((student) => {
    const monthlyExpected = student.enrollments.reduce((sum, enrollment) => sum.plus(enrollment.agreedFeeAmount), new Prisma.Decimal(0));
    const balance = student.accountEntries.reduce((sum, entry) => sum.plus(entry.amount), new Prisma.Decimal(0));
    const toCollect = Prisma.Decimal.max(new Prisma.Decimal(0), monthlyExpected.minus(balance));
    return { ...student, monthlyExpected, balance, toCollect };
  });
  const total = rows.reduce((sum, row) => sum.plus(row.toCollect), new Prisma.Decimal(0));
  return <div className="space-y-6"><PageHeader title="Tahsilatlar" description="Aktif derslerin aylık ücretleri ve mevcut öğrenci bakiyesine göre tahsil edilmesi gereken tutarlar." /><Card><CardContent className="pt-6"><div className="mb-5 grid gap-2 rounded-lg border p-4 sm:grid-cols-2"><p className="text-sm text-muted-foreground">Bugün tahsil edilmesi gereken toplam</p><p className="text-right text-2xl font-semibold">{formatMoney(total)}</p></div><Table><TableHeader><TableRow><TableHead>Öğrenci</TableHead><TableHead className="text-right">Aylık beklenen</TableHead><TableHead className="text-right">Mevcut bakiye</TableHead><TableHead className="text-right">Tahsil edilecek</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell><Link className="font-medium hover:underline" href={`/ogrenciler/${row.id}`}>{row.firstName} {row.lastName}</Link></TableCell><TableCell className="text-right">{formatMoney(row.monthlyExpected)}</TableCell><TableCell className={row.balance.greaterThanOrEqualTo(0) ? "text-right text-emerald-700" : "text-right text-destructive"}>{formatMoney(row.balance)}</TableCell><TableCell className="text-right font-medium">{formatMoney(row.toCollect)}</TableCell></TableRow>)}</TableBody></Table>{!rows.length ? <p className="py-8 text-center text-sm text-muted-foreground">Aktif öğrenci bulunamadı.</p> : null}</CardContent></Card></div>;
}
