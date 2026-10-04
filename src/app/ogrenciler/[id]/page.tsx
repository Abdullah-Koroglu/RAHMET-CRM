import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { recordStudentPayment } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PaymentActionsDialog } from "@/components/payment-actions-dialog";
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
import { TableSortLink } from "@/components/table-sort-link";
import { canMutateOperations, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { single } from "@/lib/query";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const query = await searchParams;
  const enrollmentStatus = z
    .enum(["ACTIVE", "COMPLETED", "CANCELLED"])
    .safeParse(single(query.enrollmentStatus));
  const enrollmentSort = z
    .enum(["course", "status", "fee", "sessions"])
    .catch("course")
    .parse(single(query.enrollmentSort));
  const enrollmentDirection = z
    .enum(["asc", "desc"])
    .catch("asc")
    .parse(single(query.enrollmentDirection));
  const attendanceStatus = z
    .enum(["PRESENT", "ABSENT"])
    .safeParse(single(query.attendanceStatus));
  const attendanceSort = z
    .enum(["course", "date", "status"])
    .catch("date")
    .parse(single(query.attendanceSort));
  const attendanceDirection = z
    .enum(["asc", "desc"])
    .catch("desc")
    .parse(single(query.attendanceDirection));
  const entryType = z
    .enum(["PAYMENT", "SESSION_CHARGE", "SESSION_REVERSAL"])
    .safeParse(single(query.entryType));
  const entrySort = z
    .enum(["date", "description", "amount"])
    .catch("date")
    .parse(single(query.entrySort));
  const entryDirection = z
    .enum(["asc", "desc"])
    .catch("desc")
    .parse(single(query.entryDirection));
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
  const reversalAudits = await db.auditLog.findMany({
    where: { action: "STUDENT_PAYMENT_REVERSED" },
    select: { metadata: true },
  });
  const reversedPaymentIds = new Set(
    reversalAudits.flatMap((audit) => {
      const metadata = audit.metadata;
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        return [];
      }
      const entryId = metadata.reversalOfEntryId;
      return typeof entryId === "string" ? [entryId] : [];
    }),
  );
  const balance = student.accountEntries.reduce(
    (sum, entry) => sum.plus(entry.amount),
    new Prisma.Decimal(0),
  );
  const today = new Date().toISOString().slice(0, 10);
  const displayedEnrollments = student.enrollments
    .filter(
      (enrollment) =>
        !enrollmentStatus.success || enrollment.status === enrollmentStatus.data,
    )
    .sort((left, right) => {
      const multiplier = enrollmentDirection === "asc" ? 1 : -1;
      if (enrollmentSort === "course") {
        return multiplier * left.course.name.localeCompare(right.course.name, "tr");
      }
      if (enrollmentSort === "status") {
        return multiplier * left.status.localeCompare(right.status);
      }
      if (enrollmentSort === "fee") {
        return multiplier * left.agreedFeeAmount.comparedTo(right.agreedFeeAmount);
      }
      return multiplier * (left.monthlySessionCount - right.monthlySessionCount);
    });
  const attendanceRows = student.enrollments
    .flatMap((enrollment) =>
      enrollment.attendances.map((attendance) => ({ attendance, enrollment })),
    )
    .filter(
      ({ attendance }) =>
        !attendanceStatus.success || attendance.status === attendanceStatus.data,
    )
    .sort((left, right) => {
      const multiplier = attendanceDirection === "asc" ? 1 : -1;
      if (attendanceSort === "course") {
        return multiplier * left.enrollment.course.name.localeCompare(
          right.enrollment.course.name,
          "tr",
        );
      }
      if (attendanceSort === "status") {
        return multiplier * left.attendance.status.localeCompare(right.attendance.status);
      }
      return (
        multiplier *
        (left.attendance.lessonSession.sessionDate.getTime() -
          right.attendance.lessonSession.sessionDate.getTime())
      );
    });
  const displayedEntries = student.accountEntries
    .filter((entry) => !entryType.success || entry.entryType === entryType.data)
    .sort((left, right) => {
      const multiplier = entryDirection === "asc" ? 1 : -1;
      if (entrySort === "amount") {
        return multiplier * left.amount.comparedTo(right.amount);
      }
      if (entrySort === "description") {
        const label = (entry: (typeof student.accountEntries)[number]) =>
          entry.entryType === "PAYMENT"
            ? entry.amount.lessThan(0)
              ? "Ödeme iptali"
              : "Ödeme"
            : `${entry.enrollment?.course.name ?? "Ders"} · ${entry.entryType}`;
        return multiplier * label(left).localeCompare(label(right), "tr");
      }
      return multiplier * (left.occurredOn.getTime() - right.occurredOn.getTime());
    });
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
            <form className="mb-5 flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="enrollment-status">Durum</Label>
                <select
                  id="enrollment-status"
                  name="enrollmentStatus"
                  defaultValue={enrollmentStatus.success ? enrollmentStatus.data : "ALL"}
                  className="h-8 min-w-40 rounded-lg border bg-transparent px-2 text-sm"
                >
                  <option value="ALL">Tümü</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="COMPLETED">Tamamlandı</option>
                  <option value="CANCELLED">İptal</option>
                </select>
              </div>
              <Button type="submit">Filtrele</Button>
            </form>
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    ["course", "Ders"],
                    ["status", "Durum"],
                    ["fee", "Aylık ücret"],
                    ["sessions", "Oturum"],
                  ].map(([value, label]) => (
                    <TableHead key={value}>
                      <TableSortLink
                        href={{
                          pathname: `/ogrenciler/${student.id}`,
                          query: {
                            enrollmentStatus: enrollmentStatus.success
                              ? enrollmentStatus.data
                              : "ALL",
                            enrollmentSort: value,
                            enrollmentDirection:
                              enrollmentSort === value && enrollmentDirection === "asc"
                                ? "desc"
                                : "asc",
                          },
                        }}
                        active={enrollmentSort === value}
                        direction={enrollmentDirection}
                      >
                        {label}
                      </TableSortLink>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedEnrollments.map((enrollment) => (
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
          <form className="mb-5 flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="attendance-status">Sonuç</Label>
              <select
                id="attendance-status"
                name="attendanceStatus"
                defaultValue={attendanceStatus.success ? attendanceStatus.data : "ALL"}
                className="h-8 min-w-40 rounded-lg border bg-transparent px-2 text-sm"
              >
                <option value="ALL">Tümü</option>
                <option value="PRESENT">Katıldı</option>
                <option value="ABSENT">Katılmadı</option>
              </select>
            </div>
            <Button type="submit">Filtrele</Button>
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  ["course", "Ders"],
                  ["date", "Oturum tarihi"],
                  ["status", "Sonuç"],
                ].map(([value, label]) => (
                  <TableHead key={value}>
                    <TableSortLink
                      href={{
                        pathname: `/ogrenciler/${student.id}`,
                        query: {
                          attendanceStatus: attendanceStatus.success
                            ? attendanceStatus.data
                            : "ALL",
                          attendanceSort: value,
                          attendanceDirection:
                            attendanceSort === value && attendanceDirection === "asc"
                              ? "desc"
                              : "asc",
                        },
                      }}
                      active={attendanceSort === value}
                      direction={attendanceDirection}
                    >
                      {label}
                    </TableSortLink>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceRows.map(({ attendance, enrollment }) => (
                  <TableRow key={attendance.id}>
                    <TableCell>{enrollment.course.name}</TableCell>
                    <TableCell>
                      {formatDate(attendance.lessonSession.sessionDate)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={attendance.status} />
                    </TableCell>
                  </TableRow>
              ))}
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
            <form className="mb-5 flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="entry-type">Hareket türü</Label>
                <select
                  id="entry-type"
                  name="entryType"
                  defaultValue={entryType.success ? entryType.data : "ALL"}
                  className="h-8 min-w-40 rounded-lg border bg-transparent px-2 text-sm"
                >
                  <option value="ALL">Tümü</option>
                  <option value="PAYMENT">Ödeme</option>
                  <option value="SESSION_CHARGE">Oturum borcu</option>
                  <option value="SESSION_REVERSAL">Oturum iptali</option>
                </select>
              </div>
              <Button type="submit">Filtrele</Button>
            </form>
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    ["date", "Tarih"],
                    ["description", "Açıklama"],
                    ["amount", "Tutar"],
                  ].map(([value, label]) => (
                    <TableHead
                      key={value}
                      className={value === "amount" ? "text-right" : undefined}
                    >
                      <TableSortLink
                        href={{
                          pathname: `/ogrenciler/${student.id}`,
                          query: {
                            entryType: entryType.success ? entryType.data : "ALL",
                            entrySort: value,
                            entryDirection:
                              entrySort === value && entryDirection === "asc"
                                ? "desc"
                                : "asc",
                          },
                        }}
                        active={entrySort === value}
                        direction={entryDirection}
                      >
                        {label}
                      </TableSortLink>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.occurredOn)}</TableCell>
                    <TableCell>
                      {entry.entryType === "PAYMENT"
                        ? entry.amount.lessThan(0)
                          ? "Ödeme iptali"
                          : "Ödeme"
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
                    <TableCell className="text-right">
                      {user.role === "ADMIN" &&
                      entry.entryType === "PAYMENT" &&
                      entry.amount.greaterThan(0) &&
                      !reversedPaymentIds.has(entry.id) ? (
                        <PaymentActionsDialog
                          entryId={entry.id}
                          studentId={student.id}
                          amount={entry.amount.toString()}
                          paidOn={entry.occurredOn.toISOString().slice(0, 10)}
                        />
                      ) : reversedPaymentIds.has(entry.id) ? (
                        <span className="text-muted-foreground">İptal edildi</span>
                      ) : (
                        "—"
                      )}
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
