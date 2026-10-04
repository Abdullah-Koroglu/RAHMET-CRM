import { createTeacher } from "@/app/actions";
import { z } from "zod";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
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
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { boundedQuery, single } from "@/lib/query";
import { TableSortLink } from "@/components/table-sort-link";

export const dynamic = "force-dynamic";

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const q = boundedQuery(params.q);
  const employmentType = z
    .enum(["INTERNAL", "EXTERNAL"])
    .safeParse(single(params.type));
  const sort = z
    .enum(["name", "type"])
    .catch("name")
    .parse(single(params.sort));
  const direction = z
    .enum(["asc", "desc"])
    .catch("asc")
    .parse(single(params.direction));
  const teachers = await db.teacher.findMany({
    where: {
      ...(employmentType.success
        ? { employmentType: employmentType.data }
        : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { courses: true } } },
    orderBy:
      sort === "type"
        ? { employmentType: direction }
        : { firstName: direction },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Öğretmenler"
        description="Eğitmen kadrosu ve ders yükleri."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="pt-6">
            <form className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="teacher-search">Ad veya telefon</Label>
                <Input id="teacher-search" name="q" defaultValue={q} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacher-type">Tür</Label>
                <select
                  id="teacher-type"
                  name="type"
                  defaultValue={
                    employmentType.success ? employmentType.data : "ALL"
                  }
                  className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                >
                  <option value="ALL">Tümü</option>
                  <option value="INTERNAL">Kurum içi</option>
                  <option value="EXTERNAL">Harici</option>
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
                        pathname: "/ogretmenler",
                        query: {
                          q,
                          type: employmentType.success
                            ? employmentType.data
                            : "ALL",
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
                      Ad soyad
                    </TableSortLink>
                  </TableHead>
                  <TableHead>
                    <TableSortLink
                      href={{
                        pathname: "/ogretmenler",
                        query: {
                          q,
                          type: employmentType.success
                            ? employmentType.data
                            : "ALL",
                          sort: "type",
                          direction:
                            sort === "type" && direction === "asc"
                              ? "desc"
                              : "asc",
                        },
                      }}
                      active={sort === "type"}
                      direction={direction}
                    >
                      Tür
                    </TableSortLink>
                  </TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Ders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">
                      {teacher.firstName} {teacher.lastName}
                    </TableCell>
                    <TableCell>
                      {teacher.employmentType === "INTERNAL"
                        ? "Kurum içi"
                        : "Harici"}
                    </TableCell>
                    <TableCell>{teacher.phone ?? "—"}</TableCell>
                    <TableCell>{teacher._count.courses}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {user.role === "ADMIN" ? (
          <Card>
            <CardHeader>
              <CardTitle>Yeni öğretmen</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={createTeacher} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Ad</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Soyad</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" name="phone" type="tel" maxLength={50} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employmentType">Çalışma türü</Label>
                  <Select name="employmentType" defaultValue="INTERNAL">
                    <SelectTrigger id="employmentType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INTERNAL">Kurum içi</SelectItem>
                      <SelectItem value="EXTERNAL">Harici</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit">Öğretmen ekle</Button>
              </ActionForm>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
