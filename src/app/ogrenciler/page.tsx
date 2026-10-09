import Link from "next/link";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { boundedQuery, pagination, single } from "@/lib/query";
import { TableSortLink } from "@/components/table-sort-link";

export const dynamic = "force-dynamic";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await getCurrentUser();
  const params = await searchParams;
  const q = boundedQuery(params.q);
  const courseId = z.string().uuid().safeParse(single(params.courseId));
  const academy = z
    .enum(["PRIMARY", "MIDDLE", "HIGH"])
    .safeParse(single(params.academy));
  const sort = z
    .enum(["name", "phone", "district", "courses"])
    .catch("name")
    .parse(single(params.sort));
  const direction = z
    .enum(["asc", "desc"])
    .catch("asc")
    .parse(single(params.direction));
  const { page, pageSize, skip } = pagination(params);
  const where = {
    ...(courseId.success
      ? { enrollments: { some: { courseId: courseId.data } } }
      : {}),
    ...(academy.success
      ? { academyEnrollments: { some: { academy: academy.data, isActive: true } } }
      : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };
  const [students, total, courses] = await Promise.all([
    db.student.findMany({
      where,
      include: {
        enrollments: { include: { course: true } },
        guardians: true,
        academyEnrollments: { where: { isActive: true } },
      },
      orderBy:
        sort === "district"
          ? [{ district: direction }, { firstName: "asc" }]
          : sort === "phone"
            ? [{ phone: direction }, { firstName: "asc" }]
            : [{ firstName: direction }, { lastName: direction }],
      skip,
      take: pageSize,
    }),
    db.student.count({ where }),
    db.course.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
  ]);
  const displayedStudents =
    sort === "courses"
      ? [...students].sort((left, right) => {
          const leftCourses = left.enrollments
            .map((enrollment) => enrollment.course.name)
            .sort((a, b) => a.localeCompare(b, "tr"))
            .join(", ");
          const rightCourses = right.enrollments
            .map((enrollment) => enrollment.course.name)
            .sort((a, b) => a.localeCompare(b, "tr"))
            .join(", ");
          return (direction === "asc" ? 1 : -1) * leftCourses.localeCompare(rightCourses, "tr");
        })
      : students;
  const filterParams = {
    q,
    courseId: courseId.success ? courseId.data : "ALL",
    academy: academy.success ? academy.data : "ALL",
    sort,
    direction,
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Öğrenciler"
        description="Kesin kayda dönüşmüş öğrenciler ve ders kayıtları."
      />
      <Card>
        <CardContent className="pt-6">
          <form className="mb-5 grid gap-3 md:grid-cols-[1fr_180px_180px_auto] md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="student-search">Ad soyad veya telefon</Label>
              <Input
                id="student-search"
                name="q"
                defaultValue={q}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-academy">Akademi</Label>
              <select
                id="student-academy"
                name="academy"
                defaultValue={academy.success ? academy.data : "ALL"}
                className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
              >
                <option value="ALL">Tüm akademiler</option>
                <option value="PRIMARY">İlkokul Akademi</option>
                <option value="MIDDLE">Ortaokul Akademi</option>
                <option value="HIGH">Lise Akademi</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-course">Ders</Label>
              <select
                id="student-course"
                name="courseId"
                defaultValue={courseId.success ? courseId.data : "ALL"}
                className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
              >
                <option value="ALL">Tüm dersler</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">Ara</Button>
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <TableSortLink
                    href={{
                      pathname: "/ogrenciler",
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
                    Öğrenci
                  </TableSortLink>
                </TableHead>
                <TableHead>Akademi</TableHead>
                <TableHead>Veli</TableHead>
                <TableHead>
                  <TableSortLink
                    href={{
                      pathname: "/ogrenciler",
                      query: {
                        ...filterParams,
                        sort: "phone",
                        direction: sort === "phone" && direction === "asc" ? "desc" : "asc",
                      },
                    }}
                    active={sort === "phone"}
                    direction={direction}
                  >
                    Telefon
                  </TableSortLink>
                </TableHead>
                <TableHead>
                  <TableSortLink
                    href={{
                      pathname: "/ogrenciler",
                      query: {
                        ...filterParams,
                        sort: "district",
                        direction:
                          sort === "district" && direction === "asc"
                            ? "desc"
                            : "asc",
                      },
                    }}
                    active={sort === "district"}
                    direction={direction}
                  >
                    İlçe
                  </TableSortLink>
                </TableHead>
                <TableHead>
                  <TableSortLink
                    href={{
                      pathname: "/ogrenciler",
                      query: {
                        ...filterParams,
                        sort: "courses",
                        direction: sort === "courses" && direction === "asc" ? "desc" : "asc",
                      },
                    }}
                    active={sort === "courses"}
                    direction={direction}
                  >
                    Dersler
                  </TableSortLink>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <Link
                      className="font-medium hover:underline"
                      href={`/ogrenciler/${student.id}`}
                    >
                      {student.firstName} {student.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>{student.phone ?? "—"}</TableCell>
                  <TableCell>{student.district ?? "—"}</TableCell>
                  <TableCell>
                    {student.academyEnrollments
                      .map((enrollment) => academyLabels[enrollment.academy])
                      .join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    {student.guardians
                      .map((guardian) => `${guardian.firstName} ${guardian.lastName}`)
                      .join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    {student.enrollments
                      .map((enrollment) => enrollment.course.name)
                      .join(", ") || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!students.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Öğrenci bulunamadı.
            </p>
          ) : null}
          <Pagination
            basePath="/ogrenciler"
            params={filterParams}
            page={page}
            pageSize={pageSize}
            total={total}
          />
        </CardContent>
      </Card>
    </div>
  );
}

const academyLabels = {
  PRIMARY: "İlkokul",
  MIDDLE: "Ortaokul",
  HIGH: "Lise",
};
