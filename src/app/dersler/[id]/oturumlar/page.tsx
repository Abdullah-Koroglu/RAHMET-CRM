import { notFound } from "next/navigation";
import { z } from "zod";
import {
  cancelLessonSession,
  completeLessonSession,
  createLessonSession,
  saveBulkAttendance,
} from "@/app/actions";
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

export default async function LessonSessionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const parsed = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!parsed.success) notFound();
  const course = await db.course.findUnique({
    where: { id: parsed.data },
    include: {
      lessonSessions: {
        include: { attendances: true },
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {course.lessonSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{formatDate(session.sessionDate)}</TableCell>
                    <TableCell>
                      <StatusBadge status={session.status} />
                    </TableCell>
                    <TableCell className="text-right">
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
            {!course.lessonSessions.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Henüz oturum planlanmadı.
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
