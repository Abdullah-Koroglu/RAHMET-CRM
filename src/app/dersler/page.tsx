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
  const sort = z.enum(["name", "fee"]).catch("name").parse(single(params.sort));
  const direction = z
    .enum(["asc", "desc"])
    .catch("asc")
    .parse(single(params.direction));
  const courses = await db.course.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { teacher: { firstName: { contains: q, mode: "insensitive" } } },
            { teacher: { lastName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {},
    include: {
      academicYear: true,
      teacher: true,
      sources: {
        where: { status: { not: "ARCHIVED" } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { enrollments: true, preRegistrations: true } },
    },
    orderBy:
      sort === "fee" ? { studentFeeAmount: direction } : { name: direction },
  });
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
          <form className="mb-5 flex max-w-xl items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="course-search">Ders veya eğitmen ara</Label>
              <Input
                id="course-search"
                name="q"
                defaultValue={q}
                maxLength={100}
              />
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
                        q,
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
                <TableHead>Dönem</TableHead>
                <TableHead>Eğitmen</TableHead>
                <TableHead>
                  <TableSortLink
                    href={{
                      pathname: "/dersler",
                      query: {
                        q,
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
                <TableHead>Kaynak</TableHead>
                <TableHead>Kayıtlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => {
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
