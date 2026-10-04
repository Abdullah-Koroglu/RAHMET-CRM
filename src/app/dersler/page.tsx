import Link from "next/link";
import { Plus } from "lucide-react";
import { z } from "zod";
import { db } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatMoney } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TableSortLink } from "@/components/table-sort-link";
import { boundedQuery, single } from "@/lib/query";

export const dynamic = "force-dynamic";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const q = boundedQuery(params.q);
  const academicYearId = z.string().uuid().safeParse(single(params.academicYearId));
  const teacherId = z.string().uuid().safeParse(single(params.teacherId));
  const sourceStatus = z
    .enum(["ACTIVE", "PAUSED", "ERROR", "ARCHIVED"])
    .safeParse(single(params.sourceStatus));
  const sort = z
    .enum(["name", "year", "teacher", "fee", "source", "registrations"])
    .catch("name")
    .parse(single(params.sort));
  const direction = z
    .enum(["asc", "desc"])
    .catch("asc")
    .parse(single(params.direction));
  const courses = await db.course.findMany({
    where: {
      ...(academicYearId.success ? { academicYearId: academicYearId.data } : {}),
      ...(teacherId.success ? { teacherId: teacherId.data } : {}),
      ...(sourceStatus.success
        ? {
            sources: {
              some: {
                provider: { not: "MANUAL" },
                status: sourceStatus.data,
              },
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { teacher: { firstName: { contains: q, mode: "insensitive" } } },
              { teacher: { lastName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      academicYear: true,
      teacher: true,
      sources: {
        where: { status: { not: "ARCHIVED" }, provider: { not: "MANUAL" } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { enrollments: true, preRegistrations: true } },
    },
    orderBy:
      sort === "fee"
        ? { studentFeeAmount: direction }
        : sort === "year"
          ? { academicYear: { displayName: direction } }
          : sort === "teacher"
            ? { teacher: { firstName: direction } }
            : { name: direction },
  });
  const [years, teachers] = await Promise.all([
    db.academicYear.findMany({ orderBy: { startDate: "desc" } }),
    db.teacher.findMany({ where: { isActive: true }, orderBy: { firstName: "asc" } }),
  ]);
  const displayedCourses =
    sort === "source" || sort === "registrations"
      ? [...courses].sort((left, right) => {
          const multiplier = direction === "asc" ? 1 : -1;
          if (sort === "source") {
            return multiplier * (left.sources[0]?.status ?? "UNBOUND").localeCompare(
              right.sources[0]?.status ?? "UNBOUND",
            );
          }
          const leftCount = left._count.enrollments + left._count.preRegistrations;
          const rightCount = right._count.enrollments + right._count.preRegistrations;
          return multiplier * (leftCount - rightCount);
        })
      : courses;
  const filterParams = {
    q,
    academicYearId: academicYearId.success ? academicYearId.data : "ALL",
    teacherId: teacherId.success ? teacherId.data : "ALL",
    sourceStatus: sourceStatus.success ? sourceStatus.data : "ALL",
    sort,
    direction,
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dersler"
        description="Dersleri ve Google Forms kayıt kaynaklarını yönetin."
        actions={
          user.role === "ADMIN" ? (
            <Link href="/dersler/yeni" className={buttonVariants()}>
              <Plus />
              Yeni ders
            </Link>
          ) : null
        }
      />
      <Card>
        <CardContent className="pt-6">
          <form className="mb-5 grid gap-3 lg:grid-cols-[1fr_190px_190px_180px_auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="course-search">Ders veya eğitmen ara</Label>
              <Input
                id="course-search"
                name="q"
                defaultValue={q}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-year">Dönem</Label>
              <select id="course-year" name="academicYearId" defaultValue={academicYearId.success ? academicYearId.data : "ALL"} className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm">
                <option value="ALL">Tüm dönemler</option>
                {years.map((year) => <option key={year.id} value={year.id}>{year.displayName}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-teacher">Eğitmen</Label>
              <select id="course-teacher" name="teacherId" defaultValue={teacherId.success ? teacherId.data : "ALL"} className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm">
                <option value="ALL">Tüm eğitmenler</option>
                {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-source-status">Kaynak durumu</Label>
              <select id="course-source-status" name="sourceStatus" defaultValue={sourceStatus.success ? sourceStatus.data : "ALL"} className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm">
                <option value="ALL">Tüm durumlar</option>
                <option value="ACTIVE">Aktif</option>
                <option value="PAUSED">Duraklatıldı</option>
                <option value="ERROR">Hata</option>
                <option value="ARCHIVED">Arşiv</option>
              </select>
            </div>
            <Button type="submit">Filtrele</Button>
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <TableSortLink
                    href={{
                      pathname: "/dersler",
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
                    Ders
                  </TableSortLink>
                </TableHead>
                <TableHead>
                  <TableSortLink href={{ pathname: "/dersler", query: { ...filterParams, sort: "year", direction: sort === "year" && direction === "asc" ? "desc" : "asc" } }} active={sort === "year"} direction={direction}>Dönem</TableSortLink>
                </TableHead>
                <TableHead>
                  <TableSortLink href={{ pathname: "/dersler", query: { ...filterParams, sort: "teacher", direction: sort === "teacher" && direction === "asc" ? "desc" : "asc" } }} active={sort === "teacher"} direction={direction}>Eğitmen</TableSortLink>
                </TableHead>
                <TableHead>
                  <TableSortLink
                    href={{
                      pathname: "/dersler",
                      query: {
                        ...filterParams,
                        sort: "fee",
                        direction:
                          sort === "fee" && direction === "asc"
                            ? "desc"
                            : "asc",
                      },
                    }}
                    active={sort === "fee"}
                    direction={direction}
                  >
                    Ücret
                  </TableSortLink>
                </TableHead>
                <TableHead>
                  <TableSortLink href={{ pathname: "/dersler", query: { ...filterParams, sort: "source", direction: sort === "source" && direction === "asc" ? "desc" : "asc" } }} active={sort === "source"} direction={direction}>Kaynak</TableSortLink>
                </TableHead>
                <TableHead>
                  <TableSortLink href={{ pathname: "/dersler", query: { ...filterParams, sort: "registrations", direction: sort === "registrations" && direction === "asc" ? "desc" : "asc" } }} active={sort === "registrations"} direction={direction}>Kayıtlar</TableSortLink>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedCourses.map((course) => {
                const source = course.sources[0];
                return (
                  <TableRow key={course.id}>
                    <TableCell>
                      <Link
                        className="font-medium hover:underline"
                        href={`/dersler/${course.id}`}
                      >
                        {course.name}
                      </Link>
                    </TableCell>
                    <TableCell>{course.academicYear.displayName}</TableCell>
                    <TableCell>
                      {course.teacher.firstName} {course.teacher.lastName}
                    </TableCell>
                    <TableCell>
                      {formatMoney(course.studentFeeAmount)}
                    </TableCell>
                    <TableCell>
                      {source ? (
                        <StatusBadge status={source.status} />
                      ) : (
                        <span className="text-muted-foreground">
                          Bağlı değil
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {course._count.enrollments} kesin /{" "}
                      {course._count.preRegistrations} ön
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
