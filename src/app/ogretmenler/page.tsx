import { createTeacher } from "@/app/actions";
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

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const user = await getCurrentUser();
  const teachers = await db.teacher.findMany({
    include: { _count: { select: { courses: true } } },
    orderBy: { firstName: "asc" },
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad soyad</TableHead>
                  <TableHead>Tür</TableHead>
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
