import { createAcademicYear } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
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
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { boundedQuery, single } from "@/lib/query";
import { z } from "zod";

export const dynamic = "force-dynamic";

export default async function YearsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const q = boundedQuery(params.q);
  const status = z
    .enum(["PLANNED", "ACTIVE", "CLOSED"])
    .safeParse(single(params.status));
  const sort = z
    .enum(["name", "start", "end", "status", "courses"])
    .catch("start")
    .parse(single(params.sort));
  const direction = z
    .enum(["asc", "desc"])
    .catch("desc")
    .parse(single(params.direction));
  const years = await db.academicYear.findMany({
    where: {
      ...(q ? { displayName: { contains: q, mode: "insensitive" } } : {}),
      ...(status.success ? { status: status.data } : {}),
    },
    include: { _count: { select: { courses: true } } },
    orderBy:
      sort === "name"
        ? { displayName: direction }
        : sort === "end"
          ? { endDate: direction }
          : sort === "status"
            ? { status: direction }
            : { startDate: direction },
  });
  const displayedYears =
    sort === "courses"
      ? [...years].sort(
          (left, right) =>
            (direction === "asc" ? 1 : -1) *
            (left._count.courses - right._count.courses),
        )
      : years;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Akademik yıllar"
        description="Dersleri dönemler altında yönetin."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="pt-6">
            <form className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="year-search">Dönem ara</Label>
                <Input id="year-search" name="q" defaultValue={q} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year-status">Durum</Label>
                <select
                  id="year-status"
                  name="status"
                  defaultValue={status.success ? status.data : "ALL"}
                  className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                >
                  <option value="ALL">Tümü</option>
                  <option value="PLANNED">Planlandı</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="CLOSED">Kapandı</option>
                </select>
              </div>
              <Button type="submit">Filtrele</Button>
            </form>
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    ["name", "Dönem"],
                    ["start", "Başlangıç"],
                    ["end", "Bitiş"],
                    ["status", "Durum"],
                    ["courses", "Ders"],
                  ].map(([value, label]) => (
                    <TableHead key={value}>
                      <TableSortLink
                        href={{
                          pathname: "/akademik-yillar",
                          query: {
                            q,
                            status: status.success ? status.data : "ALL",
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
                {displayedYears.map((year) => (
                  <TableRow key={year.id}>
                    <TableCell className="font-medium">
                      {year.displayName}
                    </TableCell>
                    <TableCell>
                      {year.startDate.toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell>
                      {year.endDate.toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={year.status} />
                    </TableCell>
                    <TableCell>{year._count.courses}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!displayedYears.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Seçilen filtrelere uygun dönem bulunamadı.
              </p>
            ) : null}
          </CardContent>
        </Card>
        {user.role === "ADMIN" ? (
          <Card>
            <CardHeader>
              <CardTitle>Yeni akademik yıl</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={createAcademicYear} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Görünen ad</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    placeholder="2027-2028"
                    maxLength={50}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Başlangıç</Label>
                  <Input id="startDate" name="startDate" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Bitiş</Label>
                  <Input id="endDate" name="endDate" type="date" required />
                </div>
                <Button type="submit">Dönem ekle</Button>
              </ActionForm>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
