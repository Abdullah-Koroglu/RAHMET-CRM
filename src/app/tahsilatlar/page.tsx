import Link from "next/link";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { BulkMonthlyChargeDialog, MonthlyChargeDialog, MonthlyPaymentDialog } from "@/components/monthly-charge-dialog";
import { PaymentActionsDialog } from "@/components/payment-actions-dialog";
import { PageHeader } from "@/components/page-header";
import { TableSortLink } from "@/components/table-sort-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canMutateOperations, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { boundedQuery, single } from "@/lib/query";

export const dynamic = "force-dynamic";

const monthInput = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const monthDate = (month: string) => new Date(`${month}-01T00:00:00.000Z`);

function shiftMonth(month: string, shift: number) {
  const date = monthDate(month);
  date.setUTCMonth(date.getUTCMonth() + shift);
  return date.toISOString().slice(0, 7);
}

export default async function CollectionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const month = monthInput.catch(new Date().toISOString().slice(0, 7)).parse(single(params.month));
  const billingMonth = monthDate(month);
  const q = boundedQuery(params.q);
  const balanceFilter = z.enum(["DEBT", "CREDIT", "ZERO"]).safeParse(single(params.balance));
  const sort = z.enum(["student", "expected", "paid", "remaining"]).catch("remaining").parse(single(params.sort));
  const direction = z.enum(["asc", "desc"]).catch("desc").parse(single(params.direction));

  const [students, paymentEntries, allPaymentTotals] = await Promise.all([
    db.student.findMany({
      where: { isActive: true },
      include: {
        monthlyCharges: {
          where: { billingMonth },
          include: { payments: { where: { entryType: "PAYMENT" } } },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    db.studentAccountEntry.findMany({
      where: { entryType: "PAYMENT", monthlyCharge: { billingMonth } },
      include: { student: true, monthlyCharge: true },
      orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    }),
    db.studentAccountEntry.groupBy({
      by: ["studentId"],
      where: { entryType: "PAYMENT", monthlyChargeId: { not: null } },
      _sum: { amount: true },
    }),
  ]);
  const totalPaidByStudent = new Map(allPaymentTotals.map((item) => [item.studentId, item._sum.amount ?? new Prisma.Decimal(0)]));
  const rows = students.map((student) => {
    const charge = student.monthlyCharges[0] ?? null;
    const expected = charge?.expectedAmount ?? new Prisma.Decimal(0);
    const paid = charge
      ? charge.payments.reduce((sum, entry) => sum.plus(entry.amount), new Prisma.Decimal(0))
      : new Prisma.Decimal(0);
    const remaining = Prisma.Decimal.max(new Prisma.Decimal(0), expected.minus(paid));
    const credit = Prisma.Decimal.max(new Prisma.Decimal(0), paid.minus(expected));
    return { ...student, charge, expected, paid, remaining, credit, totalPaid: totalPaidByStudent.get(student.id) ?? new Prisma.Decimal(0) };
  });
  const filteredRows = rows.filter((row) => {
    const fullName = `${row.firstName} ${row.lastName}`.toLocaleLowerCase("tr-TR");
    if (q && !fullName.includes(q.toLocaleLowerCase("tr-TR"))) return false;
    if (balanceFilter.data === "DEBT") return row.remaining.greaterThan(0);
    if (balanceFilter.data === "CREDIT") return row.credit.greaterThan(0);
    if (balanceFilter.data === "ZERO") return row.remaining.equals(0) && row.credit.equals(0);
    return true;
  }).sort((left, right) => {
    const multiplier = direction === "asc" ? 1 : -1;
    if (sort === "student") return multiplier * `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`, "tr");
    return multiplier * left[sort].comparedTo(right[sort]);
  });
  const filteredPayments = paymentEntries.filter((entry) => {
    const fullName = `${entry.student.firstName} ${entry.student.lastName}`.toLocaleLowerCase("tr-TR");
    return !q || fullName.includes(q.toLocaleLowerCase("tr-TR"));
  });
  const totals = rows.reduce((sum, row) => ({ expected: sum.expected.plus(row.expected), paid: sum.paid.plus(row.paid), remaining: sum.remaining.plus(row.remaining), credit: sum.credit.plus(row.credit) }), { expected: new Prisma.Decimal(0), paid: new Prisma.Decimal(0), remaining: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) });
  const monthlyCollected = paymentEntries.reduce((sum, entry) => sum.plus(entry.amount), new Prisma.Decimal(0));
  const today = new Date().toISOString().slice(0, 10);
  const paymentDate = today.slice(0, 7) === month ? today : `${month}-01`;
  const query = { q, balance: balanceFilter.success ? balanceFilter.data : "ALL", month };

  return <div className="space-y-6">
    <PageHeader title="Tahsilatlar" description="Öğrenci ödemeleri ödeme tarihinin ait olduğu aya otomatik yansır; aylık toplamlar ödeme kayıtlarından hesaplanır." actions={user.role === "ADMIN" ? <BulkMonthlyChargeDialog month={month} /> : undefined} />
    <Card><CardContent className="pt-6">
      <form className="mb-5 grid gap-3 sm:grid-cols-[auto_160px_1fr_180px_auto] sm:items-end">
        <Button variant="outline" render={<Link href={{ pathname: "/tahsilatlar", query: { ...query, month: shiftMonth(month, -1) } }} />}>Önceki ay</Button>
        <div className="space-y-2"><label htmlFor="collection-month" className="text-sm font-medium">Ay</label><Input id="collection-month" name="month" type="month" defaultValue={month} /></div>
        <div className="space-y-2"><label htmlFor="collection-search" className="text-sm font-medium">Öğrenci ara</label><Input id="collection-search" name="q" defaultValue={q} /></div>
        <div className="space-y-2"><label htmlFor="balance-filter" className="text-sm font-medium">Durum</label><select id="balance-filter" name="balance" defaultValue={balanceFilter.success ? balanceFilter.data : "ALL"} className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"><option value="ALL">Tümü</option><option value="DEBT">Borçlu</option><option value="CREDIT">Fazla ödemeli</option><option value="ZERO">Bakiyesi sıfır</option></select></div>
        <Button type="submit">Göster</Button>
      </form>
      <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-4">
        <div><p className="text-sm text-muted-foreground">Aylık beklenen</p><p className="text-lg font-semibold">{formatMoney(totals.expected)}</p></div>
        <div><p className="text-sm text-muted-foreground">Toplam tahsilat · {month}</p><p className="text-lg font-semibold text-emerald-700">{formatMoney(monthlyCollected)}</p></div>
        <div><p className="text-sm text-muted-foreground">Kalan borç</p><p className="text-lg font-semibold text-destructive">{formatMoney(totals.remaining)}</p></div>
        <div><p className="text-sm text-muted-foreground">Fazla ödeme</p><p className="text-lg font-semibold text-emerald-700">{formatMoney(totals.credit)}</p></div>
      </div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Aylık öğrenci özeti</CardTitle></CardHeader><CardContent>
      <Table><TableHeader><TableRow>{[["student", "Öğrenci"], ["expected", "Aylık beklenen"], ["paid", "Aylık ödenen"], ["remaining", "Kalan borç"]].map(([value, label]) => <TableHead key={value} className={value === "student" ? undefined : "text-right"}><TableSortLink href={{ pathname: "/tahsilatlar", query: { ...query, sort: value, direction: sort === value && direction === "asc" ? "desc" : "asc" } }} active={sort === value} direction={direction}>{label}</TableSortLink></TableHead>)}<TableHead className="text-right">Toplam ödeme</TableHead><TableHead className="text-right">İşlem</TableHead></TableRow></TableHeader>
        <TableBody>{filteredRows.map((row) => <TableRow key={row.id}>
          <TableCell><Link className="font-medium hover:underline" href={`/ogrenciler/${row.id}`}>{row.firstName} {row.lastName}</Link>{row.credit.greaterThan(0) ? <p className="text-xs text-emerald-700">Fazla ödeme: {formatMoney(row.credit)}</p> : null}</TableCell>
          <TableCell className="text-right">{formatMoney(row.expected)}</TableCell><TableCell className="text-right text-emerald-700">{formatMoney(row.paid)}</TableCell><TableCell className={row.remaining.greaterThan(0) ? "text-right font-medium text-destructive" : "text-right font-medium"}>{formatMoney(row.remaining)}</TableCell><TableCell className="text-right font-medium">{formatMoney(row.totalPaid)}</TableCell>
          <TableCell className="text-right"><div className="flex flex-wrap justify-end gap-2">{user.role === "ADMIN" ? <MonthlyChargeDialog studentId={row.id} studentName={`${row.firstName} ${row.lastName}`} month={month} expectedAmount={row.charge?.expectedAmount.toString()} note={row.charge?.note} /> : null}{row.charge && canMutateOperations(user.role) ? <MonthlyPaymentDialog studentId={row.id} studentName={`${row.firstName} ${row.lastName}`} monthlyChargeId={row.charge.id} month={month} today={paymentDate} /> : null}</div></TableCell>
        </TableRow>)}</TableBody></Table>
      {!filteredRows.length ? <p className="py-8 text-center text-sm text-muted-foreground">Seçilen ay ve filtrelere uygun aktif öğrenci bulunamadı.</p> : null}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Ayın tahsilat kayıtları</CardTitle></CardHeader><CardContent>
      <Table><TableHeader><TableRow><TableHead>Öğrenci</TableHead><TableHead>Ödeme tarihi</TableHead><TableHead>İlgili ay</TableHead><TableHead className="text-right">Tutar</TableHead><TableHead className="text-right">İşlem</TableHead></TableRow></TableHeader>
        <TableBody>{filteredPayments.map((entry) => <TableRow key={entry.id}>
          <TableCell><Link className="font-medium hover:underline" href={`/ogrenciler/${entry.student.id}`}>{entry.student.firstName} {entry.student.lastName}</Link></TableCell>
          <TableCell>{formatDate(entry.occurredOn)}</TableCell><TableCell>{entry.monthlyCharge?.billingMonth.toISOString().slice(0, 7) ?? "—"}</TableCell><TableCell className={entry.amount.greaterThanOrEqualTo(0) ? "text-right font-medium text-emerald-700" : "text-right font-medium text-destructive"}>{formatMoney(entry.amount)}</TableCell>
          <TableCell className="text-right">{user.role === "ADMIN" && entry.amount.greaterThan(0) ? <PaymentActionsDialog entryId={entry.id} studentId={entry.studentId} amount={entry.amount.toString()} paidOn={entry.occurredOn.toISOString().slice(0, 10)} /> : entry.amount.lessThan(0) ? <span className="text-muted-foreground">İptal kaydı</span> : "—"}</TableCell>
        </TableRow>)}</TableBody></Table>
      {!filteredPayments.length ? <p className="py-8 text-center text-sm text-muted-foreground">Bu ay için tahsilat kaydı yok.</p> : null}
    </CardContent></Card>
  </div>;
}
