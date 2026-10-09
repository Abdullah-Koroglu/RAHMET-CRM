import { notFound } from "next/navigation";
import { AcademyType, Prisma } from "@prisma/client";
import { AcademyEnrollmentDialog, AcademyPaymentDialog } from "@/components/academy-enrollment-dialog";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canMutateOperations, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const academyBySlug = {
  ilkokul: { type: "PRIMARY" as AcademyType, name: "İlkokul Akademi" },
  ortaokul: { type: "MIDDLE" as AcademyType, name: "Ortaokul Akademi" },
  lise: { type: "HIGH" as AcademyType, name: "Lise Akademi" },
};

export default async function AcademyPage({ params }: { params: Promise<{ academy: string }> }) {
  const academy = academyBySlug[(await params).academy as keyof typeof academyBySlug];
  if (!academy) notFound();
  const user = await getCurrentUser();
  const enrollments = await db.academyEnrollment.findMany({
    where: { academy: academy.type, isActive: true },
    include: { student: { include: { guardians: true } }, payments: { orderBy: { paidOn: "desc" } } },
    orderBy: [{ student: { firstName: "asc" } }, { student: { lastName: "asc" } }],
  });
  const rows = enrollments.map((enrollment) => {
    const paid = enrollment.payments.reduce((total, payment) => total.plus(payment.amount), new Prisma.Decimal(0));
    return { ...enrollment, paid, remaining: Prisma.Decimal.max(new Prisma.Decimal(0), enrollment.feeAmount.minus(paid)) };
  });
  const totals = rows.reduce((total, row) => ({ fee: total.fee.plus(row.feeAmount), paid: total.paid.plus(row.paid), remaining: total.remaining.plus(row.remaining) }), { fee: new Prisma.Decimal(0), paid: new Prisma.Decimal(0), remaining: new Prisma.Decimal(0) });
  return <div className="space-y-6"><PageHeader title={academy.name} description="Ders ayrımı olmadan öğrenci, veli ve toplam akademi ücretlerini yönetin." actions={canMutateOperations(user.role) ? <AcademyEnrollmentDialog academy={academy.type} academyName={academy.name} /> : undefined} /><div className="grid gap-3 sm:grid-cols-3"><Summary label="Toplam kayıt ücreti" value={formatMoney(totals.fee)} /><Summary label="Tahsil edilen" value={formatMoney(totals.paid)} tone="text-emerald-700" /><Summary label="Kalan borç" value={formatMoney(totals.remaining)} tone={totals.remaining.greaterThan(0) ? "text-destructive" : undefined} /></div><Card><CardHeader><CardTitle>Öğrenciler</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Öğrenci</TableHead><TableHead>Veli</TableHead><TableHead>Sınıf</TableHead><TableHead className="text-right">Akademi ücreti</TableHead><TableHead className="text-right">Ödenen</TableHead><TableHead className="text-right">Kalan</TableHead><TableHead>Son ödeme</TableHead><TableHead className="text-right">İşlem</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => { const guardian = row.student.guardians[0]; const latestPayment = row.payments[0]; return <TableRow key={row.id}><TableCell><p className="font-medium">{row.student.firstName} {row.student.lastName}</p>{row.student.phone ? <p className="text-xs text-muted-foreground">{row.student.phone}</p> : null}</TableCell><TableCell>{guardian ? <><p>{guardian.firstName} {guardian.lastName}</p><p className="text-xs text-muted-foreground">{guardian.relationship} · {guardian.phone}</p></> : <Badge variant="outline">Veli yok</Badge>}</TableCell><TableCell>{row.student.classLevel ?? "—"}</TableCell><TableCell className="text-right">{formatMoney(row.feeAmount)}</TableCell><TableCell className="text-right text-emerald-700">{formatMoney(row.paid)}</TableCell><TableCell className={row.remaining.greaterThan(0) ? "text-right font-medium text-destructive" : "text-right"}>{formatMoney(row.remaining)}</TableCell><TableCell>{latestPayment ? <>{formatDate(latestPayment.paidOn)}<p className="text-xs text-muted-foreground">{formatMoney(latestPayment.amount)}</p></> : "—"}</TableCell><TableCell className="text-right">{canMutateOperations(user.role) ? <AcademyPaymentDialog enrollmentId={row.id} studentName={`${row.student.firstName} ${row.student.lastName}`} /> : "—"}</TableCell></TableRow>; })}</TableBody></Table>{!rows.length ? <p className="py-8 text-center text-sm text-muted-foreground">Henüz öğrenci kaydı yok.</p> : null}</CardContent></Card></div>;
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: string }) { return <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{label}</p><p className={`text-lg font-semibold ${tone ?? ""}`}>{value}</p></CardContent></Card>; }
