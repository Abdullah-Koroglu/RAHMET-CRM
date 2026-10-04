import Link from "next/link";
import type { Prisma, PreRegistrationStatus } from "@prisma/client";
import { z } from "zod";
import {
  addPreRegistrationNote,
  changePreRegistrationStatus,
  convertPreRegistration,
} from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { ManualPreRegistrationDialog } from "@/components/manual-pre-registration-dialog";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { canMutateOperations, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, statusLabels } from "@/lib/format";
import { pagination, single } from "@/lib/query";

export const dynamic = "force-dynamic";
const statuses: PreRegistrationStatus[] = [
  "NEW",
  "IN_REVIEW",
  "CONTACTED",
  "APPROVED",
  "REJECTED",
  "CONVERTED",
];
const statusSchema = z.enum(statuses);

export default async function PreRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const q = z.string().trim().max(100).catch("").parse(single(params.q));
  const parsedStatus = statusSchema.safeParse(single(params.status));
  const status = parsedStatus.success ? parsedStatus.data : undefined;
  const parsedCourse = z.string().uuid().safeParse(single(params.courseId));
  const courseId = parsedCourse.success ? parsedCourse.data : undefined;
  const parsedSelected = z.string().uuid().safeParse(single(params.selected));
  const selectedId = parsedSelected.success ? parsedSelected.data : undefined;
  const { page, pageSize, skip } = pagination(params);
  const where: Prisma.PreRegistrationWhereInput = {
    ...(status ? { status } : {}),
    ...(courseId ? { courseId } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { phoneRaw: { contains: q } },
            { phoneNormalized: { contains: q } },
          ],
        }
      : {}),
  };
  const [items, total, courses, selected] = await Promise.all([
    db.preRegistration.findMany({
      where,
      include: { course: true, source: true, assignedOperator: true },
      orderBy: { receivedAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.preRegistration.count({ where }),
    db.course.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    selectedId
      ? db.preRegistration.findUnique({
          where: { id: selectedId },
          include: {
            course: true,
            source: true,
            assignedOperator: true,
            conversion: { include: { student: true, enrollment: true } },
            activities: {
              include: { actor: true },
              orderBy: { createdAt: "desc" },
            },
          },
        })
      : null,
  ]);
  const canMutate = canMutateOperations(user.role);
  const filterParams = {
    q,
    status: status ?? "ALL",
    courseId: courseId ?? "ALL",
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ön kayıtlar"
        description="Form yanıtlarını inceleyin, iletişim sürecini yönetin ve kesin kayda dönüştürün."
      />
      {canMutate ? (
        <div className="flex justify-end">
          <ManualPreRegistrationDialog courses={courses} />
        </div>
      ) : null}
      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="pre-search">Ad soyad veya telefon</Label>
              <Input
                id="pre-search"
                name="q"
                defaultValue={q}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-filter">Ders</Label>
              <Select name="courseId" defaultValue={courseId ?? "ALL"}>
                <SelectTrigger id="course-filter">
                  <SelectValue placeholder="Tüm dersler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tüm dersler</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-filter">Durum</Label>
              <Select name="status" defaultValue={status ?? "ALL"}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Tüm durumlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tüm durumlar</SelectItem>
                  {statuses.map((item) => (
                    <SelectItem key={item} value={item}>
                      {statusLabels[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Filtrele</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-6 2xl:grid-cols-[1fr_420px]">
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Başvuru</TableHead>
                  <TableHead>Ders</TableHead>
                  <TableHead>Kaynak</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Alınma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        className="font-medium hover:underline"
                        href={{
                          pathname: "/on-kayitlar",
                          query: {
                            ...filterParams,
                            page,
                            pageSize,
                            selected: item.id,
                          },
                        }}
                      >
                        {item.fullName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {item.phoneNormalized ?? item.phoneRaw}
                      </p>
                    </TableCell>
                    <TableCell>{item.course.name}</TableCell>
                    <TableCell>
                      {item.source.sheetName ?? item.source.sheetGid}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>{formatDate(item.receivedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!items.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Bu ölçütlerde ön kayıt bulunamadı.
              </p>
            ) : null}
            <Pagination
              basePath="/on-kayitlar"
              params={filterParams}
              page={page}
              pageSize={pageSize}
              total={total}
            />
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>
              {selected ? selected.fullName : "Ön kayıt detayı"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Ders</p>
                    <p className="font-medium">{selected.course.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Durum</p>
                    <StatusBadge status={selected.status} />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Telefon</p>
                    <p>{selected.phoneNormalized ?? selected.phoneRaw}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">İlçe</p>
                    <p>{selected.district ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Doğum tarihi</p>
                    <p>
                      {selected.birthDate?.toLocaleDateString("tr-TR") ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Kaynak</p>
                    <p>{selected.source.sheetName ?? "Form Yanıtları"}</p>
                  </div>
                </div>
                {Array.isArray(selected.validationErrors) &&
                selected.validationErrors.length ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                    Doğrulama: {selected.validationErrors.join(", ")}
                  </div>
                ) : null}
                {selected.conversion ? (
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Kesin kayda dönüştü</p>
                    <Link
                      className="text-primary hover:underline"
                      href={`/ogrenciler/${selected.conversion.studentId}`}
                    >
                      {selected.conversion.student.firstName}{" "}
                      {selected.conversion.student.lastName}
                    </Link>
                  </div>
                ) : canMutate ? (
                  <>
                    <ActionForm
                      action={changePreRegistrationStatus}
                      className="flex flex-wrap gap-2"
                    >
                      <input type="hidden" name="id" value={selected.id} />
                      <Select name="status" defaultValue={selected.status}>
                        <SelectTrigger
                          aria-label="Yeni durum"
                          className="min-w-48"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses
                            .filter((item) => item !== "CONVERTED")
                            .map((item) => (
                              <SelectItem key={item} value={item}>
                                {statusLabels[item]}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button type="submit" variant="outline">
                        Durumu kaydet
                      </Button>
                    </ActionForm>
                    <ActionForm
                      action={addPreRegistrationNote}
                      className="space-y-2"
                    >
                      <input type="hidden" name="id" value={selected.id} />
                      <Label htmlFor="note">Operatör notu</Label>
                      <Textarea
                        id="note"
                        name="note"
                        maxLength={2000}
                        required
                      />
                      <Button type="submit" variant="outline">
                        Not ekle
                      </Button>
                    </ActionForm>
                    {selected.status === "APPROVED" ? (
                      <ActionForm action={convertPreRegistration}>
                        <input type="hidden" name="id" value={selected.id} />
                        <Button type="submit" className="w-full">
                          Kesin öğrenci kaydına dönüştür
                        </Button>
                      </ActionForm>
                    ) : null}
                  </>
                ) : null}
                <div>
                  <p className="mb-2 text-sm font-medium">İşlem geçmişi</p>
                  <div className="space-y-2">
                    {selected.activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="rounded-md bg-muted p-2 text-xs"
                      >
                        <p>
                          {activity.activityType === "NOTE"
                            ? activity.note
                            : `${activity.fromStatus ? statusLabels[activity.fromStatus] : ""} → ${activity.toStatus ? statusLabels[activity.toStatus] : activity.activityType}`}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {activity.actor?.displayName ?? "Sistem"} ·{" "}
                          {formatDate(activity.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                İncelemek için listeden bir kayıt seçin.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
