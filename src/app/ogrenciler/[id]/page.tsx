import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { recordStudentPayment } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { canMutateOperations, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const route = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!route.success) notFound();
  const student = await db.student.findUnique({
    where: { id: route.data },
    include: {
      enrollments: {
        include: {
          course: { include: { academicYear: true } },
          attendances: {
            include: { lessonSession: true },
            orderBy: { lessonSession: { sessionDate: "desc" } },
          },
        },
      },
      accountEntries: {
        include: { enrollment: { include: { course: true } } },
        orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!student) notFound();
  const balance = student.accountEntries.reduce(
    (sum, entry) => sum.plus(entry.amount),
    new Prisma.Decimal(0),
  );
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description="Öğrenci profili, ders kayıtları ve cari hesabı."
      />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>İletişim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Telefon</p>
              <p>{student.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">İlçe</p>
              <p>{student.district ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ders kayıtları</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ders</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Aylık ücret</TableHead>
                  <TableHead>Oturum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>{enrollment.course.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={enrollment.status} />
                    </TableCell>
                    <TableCell>
                      {formatMoney(enrollment.agreedFeeAmount)}
                    </TableCell>
                    <TableCell>{enrollment.monthlySessionCount}/ay</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Yoklama geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ders</TableHead>
                <TableHead>Oturum tarihi</TableHead>
                <TableHead>Sonuç</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {student.enrollments.flatMap((enrollment) =>
                enrollment.attendances.map((attendance) => (
                  <TableRow key={attendance.id}>
                    <TableCell>{enrollment.course.name}</TableCell>
                    <TableCell>
                      {formatDate(attendance.lessonSession.sessionDate)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={attendance.status} />
                    </TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </Table>
          {student.enrollments.every(
            (enrollment) => !enrollment.attendances.length,
          ) ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Henüz yoklama kaydı yok.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cari hesap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Güncel bakiye</p>
            <p
              className={
                balance.greaterThanOrEqualTo(0)
                  ? "text-3xl font-semibold text-emerald-700"
                  : "text-3xl font-semibold text-destructive"
              }
            >
              {formatMoney(balance)}
            </p>
            <p className="text-sm text-muted-foreground">
              {balance.greaterThanOrEqualTo(0)
                ? "Kullanılabilir ödeme bakiyesi"
                : "Ödenmesi gereken borç"}
            </p>
            {canMutateOperations(user.role) ? (
              <ActionForm
                action={recordStudentPayment}
                className="space-y-3 border-t pt-4"
              >
                <input type="hidden" name="studentId" value={student.id} />
                <div className="space-y-2">
                  <Label htmlFor="amount">Alınan ödeme (TL)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paidOn">Ödeme tarihi</Label>
                  <Input
                    id="paidOn"
                    name="paidOn"
                    type="date"
                    defaultValue={today}
                    required
                  />
                </div>
                <Button type="submit">Ödemeyi ekle</Button>
              </ActionForm>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hesap hareketleri</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.accountEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.occurredOn)}</TableCell>
                    <TableCell>
                      {entry.entryType === "PAYMENT"
                        ? "Ödeme"
                        : entry.entryType === "SESSION_REVERSAL"
                          ? `${entry.enrollment?.course.name ?? "Ders"} · oturum iptali`
                          : `${entry.enrollment?.course.name ?? "Ders"} · gerçekleşen oturum`}
                    </TableCell>
                    <TableCell
                      className={
                        entry.amount.greaterThan(0)
                          ? "text-right text-emerald-700"
                          : "text-right text-destructive"
                      }
                    >
                      {formatMoney(entry.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!student.accountEntries.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Henüz hesap hareketi yok.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
