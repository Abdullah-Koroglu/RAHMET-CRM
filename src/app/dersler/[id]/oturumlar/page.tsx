import { notFound } from "next/navigation";
import { z } from "zod";
import {
  cancelLessonSession,
  completeLessonSession,
  createLessonSession,
  saveBulkAttendance,
} from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { AttendanceResultsDialog } from "@/components/attendance-results-dialog";
import { TableSortLink } from "@/components/table-sort-link";
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
import { single } from "@/lib/query";

export const dynamic = "force-dynamic";

export default async function LessonSessionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const query = await searchParams;
  const statusFilter = z
    .enum(["PLANNED", "COMPLETED", "CANCELLED"])
    .safeParse(single(query.status));
  const sort = z
    .enum(["date", "status", "attendance"])
    .catch("date")
    .parse(single(query.sort));
  const direction = z
    .enum(["asc", "desc"])
    .catch("desc")
    .parse(single(query.direction));
  const parsed = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!parsed.success) notFound();
  const course = await db.course.findUnique({
    where: { id: parsed.data },
    include: {
      lessonSessions: {
        include: {
          attendances: {
            include: { enrollment: { include: { student: true } } },
          },
        },
        orderBy: { sessionDate: "desc" },
      },
      enrollments: {
        where: { status: "ACTIVE" },
        include: { student: true },
        orderBy: { student: { firstName: "asc" } },
      },
    },
  });
  if (!course) notFound();
  const perSession = course.studentFeeAmount
    .div(course.monthlySessionCount)
    .toDecimalPlaces(2);
  const attendanceSession = course.lessonSessions.find(
    (session) => session.status !== "CANCELLED",
  );
  const displayedSessions = course.lessonSessions
    .filter((session) => !statusFilter.success || session.status === statusFilter.data)
    .sort((left, right) => {
      const multiplier = direction === "asc" ? 1 : -1;
      if (sort === "date") {
        return multiplier * (left.sessionDate.getTime() - right.sessionDate.getTime());
      }
      if (sort === "status") return multiplier * left.status.localeCompare(right.status);
      return multiplier * (left.attendances.length - right.attendances.length);
    });
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${course.name} · Oturumlar`}
        description={`Aylık ${formatMoney(course.studentFeeAmount)} / ${course.monthlySessionCount} oturum · yaklaşık ${formatMoney(perSession)} oturum ücreti.`}
      />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Oturum planla</CardTitle>
          </CardHeader>
          <CardContent>
            {canMutateOperations(user.role) ? (
              <ActionForm action={createLessonSession} className="space-y-3">
                <input type="hidden" name="courseId" value={course.id} />
                <div className="space-y-2">
                  <Label htmlFor="sessionDate">Tarih</Label>
                  <Input
                    id="sessionDate"
                    name="sessionDate"
                    type="date"
                    required
                  />
                </div>
                <Button type="submit">Oturum oluştur</Button>
              </ActionForm>
            ) : (
              <p className="text-sm text-muted-foreground">
                Oturum oluşturma yetkiniz yok.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Oturum geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="mb-5 flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="session-status">Durum</Label>
                <select
                  id="session-status"
                  name="status"
                  defaultValue={statusFilter.success ? statusFilter.data : "ALL"}
                  className="h-8 min-w-40 rounded-lg border bg-transparent px-2 text-sm"
                >
                  <option value="ALL">Tümü</option>
                  <option value="PLANNED">Planlandı</option>
                  <option value="COMPLETED">Gerçekleşti</option>
                  <option value="CANCELLED">İptal</option>
                </select>
              </div>
              <Button type="submit">Filtrele</Button>
            </form>
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    ["date", "Tarih"],
                    ["status", "Durum"],
                    ["attendance", "Yoklama"],
                  ].map(([value, label]) => (
                    <TableHead key={value}>
                      <TableSortLink
                        href={{
                          pathname: `/dersler/${course.id}/oturumlar`,
                          query: {
                            status: statusFilter.success ? statusFilter.data : "ALL",
                            sort: value,
                            direction:
                              sort === value && direction === "asc"
                                ? "desc"
                                : "asc",
                          },
                        }}
                        active={sort === value}
                        direction={direction}
                      >
                        {label}
                      </TableSortLink>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{formatDate(session.sessionDate)}</TableCell>
                    <TableCell>
                      <StatusBadge status={session.status} />
                    </TableCell>
                    <TableCell>
                      {session.attendances.length
                        ? `${session.attendances.filter((attendance) => attendance.status === "PRESENT").length} katıldı / ${session.attendances.length}`
                        : "Henüz girilmedi"}
                    </TableCell>
                    <TableCell className="text-right">
                      {session.attendances.length ? (
                        <AttendanceResultsDialog
                          date={formatDate(session.sessionDate)}
                          entries={session.attendances.map((attendance) => ({
                            id: attendance.id,
                            name: `${attendance.enrollment.student.firstName} ${attendance.enrollment.student.lastName}`,
                            status: attendance.status,
                          }))}
                        />
                      ) : null}
                      {session.status === "PLANNED" &&
                      canMutateOperations(user.role) ? (
                        <ActionForm action={completeLessonSession}>
                          <input
                            type="hidden"
                            name="sessionId"
                            value={session.id}
                          />
                          <Button size="sm" type="submit">
                            Gerçekleşti
                          </Button>
                        </ActionForm>
                      ) : null}
                      {session.status !== "CANCELLED" &&
                      user.role === "ADMIN" ? (
                        <ActionForm action={cancelLessonSession}>
                          <input
                            type="hidden"
                            name="sessionId"
                            value={session.id}
                          />
                          <Button size="sm" variant="outline" type="submit">
                            İptal
                          </Button>
                        </ActionForm>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!displayedSessions.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Seçilen filtrelere uygun oturum bulunamadı.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
      {attendanceSession && canMutateOperations(user.role) ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Toplu yoklama · {formatDate(attendanceSession.sessionDate)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={saveBulkAttendance} className="space-y-4">
              <input
                type="hidden"
                name="sessionId"
                value={attendanceSession.id}
              />
              <p className="text-sm text-muted-foreground">
                Kağıt listedeki katılan öğrencileri işaretleyin.
                İşaretlenmeyenler “katılmadı” olarak kaydedilir.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {course.enrollments.map((enrollment) => {
                  const attendance = attendanceSession.attendances.find(
                    (item) => item.enrollmentId === enrollment.id,
                  );
                  return (
                    <label
                      key={enrollment.id}
                      className="flex items-center gap-2 rounded-md border p-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="presentEnrollmentId"
                        value={enrollment.id}
                        defaultChecked={attendance?.status === "PRESENT"}
                      />
                      {enrollment.student.firstName}{" "}
                      {enrollment.student.lastName}
                    </label>
                  );
                })}
              </div>
              <Button type="submit">Yoklamayı kaydet</Button>
            </ActionForm>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
