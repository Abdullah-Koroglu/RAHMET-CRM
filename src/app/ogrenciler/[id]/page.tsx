import { notFound } from "next/navigation";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getCurrentUser();
  const route = z.string().uuid().safeParse((await params).id);
  if (!route.success) notFound();
  const id = route.data;
  const student = await db.student.findUnique({ where: { id }, include: { enrollments: { include: { course: { include: { academicYear: true } } } } } });
  if (!student) notFound();
  return <div className="space-y-6"><PageHeader title={`${student.firstName} ${student.lastName}`} description="Öğrenci profili ve ders kayıtları." /><div className="grid gap-6 xl:grid-cols-[360px_1fr]"><Card><CardHeader><CardTitle>İletişim</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div><p className="text-muted-foreground">Telefon</p><p>{student.phone ?? "—"}</p></div><div><p className="text-muted-foreground">Doğum tarihi</p><p>{student.birthDate?.toLocaleDateString("tr-TR") ?? "—"}</p></div><div><p className="text-muted-foreground">İlçe</p><p>{student.district ?? "—"}</p></div></CardContent></Card><Card><CardHeader><CardTitle>Ders kayıtları</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Ders</TableHead><TableHead>Dönem</TableHead><TableHead>Durum</TableHead><TableHead>Ücret</TableHead></TableRow></TableHeader><TableBody>{student.enrollments.map((enrollment) => <TableRow key={enrollment.id}><TableCell>{enrollment.course.name}</TableCell><TableCell>{enrollment.course.academicYear.displayName}</TableCell><TableCell><StatusBadge status={enrollment.status} /></TableCell><TableCell>{formatMoney(enrollment.agreedFeeAmount)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div></div>;
}
