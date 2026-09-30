import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { boundedQuery, pagination } from "@/lib/query";

export const dynamic = "force-dynamic";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await getCurrentUser();
  const params = await searchParams;
  const q = boundedQuery(params.q);
  const { page, pageSize, skip } = pagination(params);
  const where = q ? { OR: [{ firstName: { contains: q, mode: "insensitive" as const } }, { lastName: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }] } : {};
  const [students, total] = await Promise.all([db.student.findMany({ where, include: { enrollments: { include: { course: true } } }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }], skip, take: pageSize }), db.student.count({ where })]);
  return <div className="space-y-6"><PageHeader title="Öğrenciler" description="Kesin kayda dönüşmüş öğrenciler ve ders kayıtları." /><Card><CardContent className="pt-6"><form className="mb-5 flex max-w-lg items-end gap-2"><div className="flex-1 space-y-2"><Label htmlFor="student-search">Ad soyad veya telefon</Label><Input id="student-search" name="q" defaultValue={q} maxLength={100} /></div><Button type="submit">Ara</Button></form><Table><TableHeader><TableRow><TableHead>Öğrenci</TableHead><TableHead>Telefon</TableHead><TableHead>İlçe</TableHead><TableHead>Dersler</TableHead></TableRow></TableHeader><TableBody>{students.map((student) => <TableRow key={student.id}><TableCell><Link className="font-medium hover:underline" href={`/ogrenciler/${student.id}`}>{student.firstName} {student.lastName}</Link></TableCell><TableCell>{student.phone ?? "—"}</TableCell><TableCell>{student.district ?? "—"}</TableCell><TableCell>{student.enrollments.map((enrollment) => enrollment.course.name).join(", ") || "—"}</TableCell></TableRow>)}</TableBody></Table>{!students.length ? <p className="py-8 text-center text-sm text-muted-foreground">Öğrenci bulunamadı.</p> : null}<Pagination basePath="/ogrenciler" params={{ q }} page={page} pageSize={pageSize} total={total} /></CardContent></Card></div>;
}
