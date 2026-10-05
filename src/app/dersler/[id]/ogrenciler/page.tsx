import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { TableSortLink } from "@/components/table-sort-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatDate } from "@/lib/format";
import { single } from "@/lib/query";

export const dynamic = "force-dynamic";

export default async function CourseStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await getCurrentUser();
  const route = z.string().uuid().safeParse((await params).id);
  if (!route.success) notFound();
  const query = await searchParams;
  const sort = z
    .enum(["name", "phone", "district", "date"])
    .catch("name")
    .parse(single(query.sort));
  const direction = z
    .enum(["asc", "desc"])
    .catch("asc")
    .parse(single(query.direction));
  const course = await db.course.findUnique({
    where: { id: route.data },
    include: {
      academicYear: true,
      enrollments: {
        where: { status: "ACTIVE" },
        include: { student: true },
        orderBy:
          sort === "phone"
            ? { student: { phone: direction } }
            : sort === "district"
              ? { student: { district: direction } }
              : sort === "date"
                ? { enrollmentDate: direction }
                : { student: { firstName: direction } },
      },
    },
  });
  if (!course) notFound();
  const filterParams = { sort, direction };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={`${course.name} · Aktif öğrenciler`}
          description={`${course.academicYear.displayName} döneminde aktif kesin kayıtlı ${course.enrollments.length} öğrenci.`}
        />
        <Button variant="outline" render={<Link href={`/dersler/${course.id}`} />}>
          Ders detayına dön
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  ["name", "Öğrenci"],
                  ["phone", "Telefon"],
                  ["district", "İlçe"],
                  ["date", "Kayıt tarihi"],
                ].map(([value, label]) => (
                  <TableHead key={value}>
                    <TableSortLink
                      href={{
                        pathname: `/dersler/${course.id}/ogrenciler`,
                        query: {
                          ...filterParams,
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {course.enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>
                    <Link
                      href={`/ogrenciler/${enrollment.student.id}`}
                      className="font-medium hover:underline"
                    >
                      {enrollment.student.firstName} {enrollment.student.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>{enrollment.student.phone ?? "—"}</TableCell>
                  <TableCell>{enrollment.student.district ?? "—"}</TableCell>
                  <TableCell>{formatDate(enrollment.enrollmentDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!course.enrollments.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Bu derste aktif kesin kayıt bulunmuyor.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
