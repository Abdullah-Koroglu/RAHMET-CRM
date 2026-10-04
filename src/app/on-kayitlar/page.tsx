import Link from "next/link";
import type { Prisma, PreRegistrationStatus } from "@prisma/client";
import { z } from "zod";
import {
  addPreRegistrationNote,
  changePreRegistrationStatus,
} from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { ConvertPreRegistrationDialog } from "@/components/convert-pre-registration-dialog";
import { ManualPreRegistrationDialog } from "@/components/manual-pre-registration-dialog";
import { TableSortLink } from "@/components/table-sort-link";
import {
  TableFilterMenu,
  TableSearchFilterMenu,
} from "@/components/table-filter-menu";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const sort = z
    .enum(["name", "course", "source", "status", "received"])
    .catch("received")
    .parse(single(params.sort));
  const direction = z
    .enum(["asc", "desc"])
    .catch("desc")
    .parse(single(params.direction));
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
      orderBy:
        sort === "name"
          ? { fullName: direction }
          : sort === "course"
            ? { course: { name: direction } }
            : sort === "source"
              ? { source: { sheetName: direction } }
            : sort === "status"
              ? { status: direction }
              : { receivedAt: direction },
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
    sort,
    direction,
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
      <div className="grid gap-6 2xl:grid-cols-[1fr_420px]">
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <TableSortLink
                      href={{
                        pathname: "/on-kayitlar",
                        query: {
                          ...filterParams,
                          sort: "name",
                          direction:
                            sort === "name" && direction === "asc"
                              ? "desc"
                              : "asc",
                        },
                      }}
                      active={sort === "name"}
                      direction={direction}
                    >
                      Başvuru
                    </TableSortLink>
                    <TableSearchFilterMenu
                      label="Başvuru"
                      pathname="/on-kayitlar"
                      params={filterParams}
                      param="q"
                      value={q}
                      placeholder="Ad soyad veya telefon"
                    />
                  </TableHead>
                  <TableHead>
                    <TableSortLink
                      href={{
                        pathname: "/on-kayitlar",
                        query: {
                          ...filterParams,
                          sort: "course",
                          direction:
                            sort === "course" && direction === "asc"
                              ? "desc"
                              : "asc",
                        },
                      }}
                      active={sort === "course"}
                      direction={direction}
                    >
                      Ders
                    </TableSortLink>
                    <TableFilterMenu
                      label="Ders"
                      pathname="/on-kayitlar"
                      params={filterParams}
                      param="courseId"
                      value={courseId ?? "ALL"}
                      options={[
                        { label: "Tüm dersler", value: "ALL" },
                        ...courses.map((course) => ({ label: course.name, value: course.id })),
                      ]}
                    />
                  </TableHead>
                  <TableHead>
                    <TableSortLink
                      href={{
                        pathname: "/on-kayitlar",
                        query: {
                          ...filterParams,
                          sort: "source",
                          direction:
                            sort === "source" && direction === "asc"
                              ? "desc"
                              : "asc",
                        },
                      }}
                      active={sort === "source"}
                      direction={direction}
                    >
                      Kaynak
                    </TableSortLink>
                  </TableHead>
                  <TableHead>
                    <TableSortLink
                      href={{
                        pathname: "/on-kayitlar",
                        query: {
                          ...filterParams,
                          sort: "status",
                          direction:
                            sort === "status" && direction === "asc"
                              ? "desc"
                              : "asc",
                        },
                      }}
                      active={sort === "status"}
                      direction={direction}
                    >
                      Durum
                    </TableSortLink>
                    <TableFilterMenu
                      label="Durum"
                      pathname="/on-kayitlar"
                      params={filterParams}
                      param="status"
                      value={status ?? "ALL"}
                      options={[
                        { label: "Tüm durumlar", value: "ALL" },
                        ...statuses.map((item) => ({ label: statusLabels[item], value: item })),
                      ]}
                    />
                  </TableHead>
                  <TableHead>
                    <TableSortLink
                      href={{
                        pathname: "/on-kayitlar",
                        query: {
                          ...filterParams,
                          sort: "received",
                          direction:
                            sort === "received" && direction === "asc"
                              ? "desc"
                              : "asc",
                        },
                      }}
                      active={sort === "received"}
                      direction={direction}
                    >
                      Alınma
                    </TableSortLink>
                  </TableHead>
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
                      <ConvertPreRegistrationDialog
                        id={selected.id}
                        fullName={selected.fullName}
                        courseName={selected.course.name}
                      />
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
