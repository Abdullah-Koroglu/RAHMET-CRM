import { createCourse } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  await requireRole(["ADMIN"]);
  const [years, teachers] = await Promise.all([
    db.academicYear.findMany({ where: { status: "ACTIVE" }, orderBy: { startDate: "desc" } }),
    db.teacher.findMany({ where: { isActive: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
  ]);
  return <div className="space-y-6"><PageHeader title="Yeni ders" description="Dersin aylık ücreti ve planlı oturum sayısını belirleyin." /><Card className="max-w-2xl"><CardHeader><CardTitle>Ders bilgileri</CardTitle></CardHeader><CardContent><ActionForm action={createCourse} className="grid gap-5 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="name">Ders adı</Label><Input id="name" name="name" maxLength={150} required /></div><div className="space-y-2"><Label htmlFor="academicYearId">Akademik yıl</Label><Select name="academicYearId" required><SelectTrigger id="academicYearId"><SelectValue placeholder="Dönem seçin" /></SelectTrigger><SelectContent>{years.map((year) => <SelectItem key={year.id} value={year.id}>{year.displayName}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="teacherId">Eğitmen</Label><Select name="teacherId" required><SelectTrigger id="teacherId"><SelectValue placeholder="Eğitmen seçin" /></SelectTrigger><SelectContent>{teachers.map((teacher) => <SelectItem key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="studentFeeAmount">Aylık öğrenci ücreti (TL)</Label><Input id="studentFeeAmount" name="studentFeeAmount" type="number" min="0" max="999999999" step="0.01" defaultValue="0" required /></div><div className="space-y-2"><Label htmlFor="monthlySessionCount">Aylık planlı oturum</Label><Input id="monthlySessionCount" name="monthlySessionCount" type="number" min="1" max="31" defaultValue="4" required /></div><div className="space-y-2"><Label htmlFor="teacherFeeAmount">Eğitmen ücreti (TL)</Label><Input id="teacherFeeAmount" name="teacherFeeAmount" type="number" min="0" max="999999999" step="0.01" defaultValue="0" required /></div><div className="sm:col-span-2"><Button type="submit">Dersi oluştur</Button></div></ActionForm></CardContent></Card></div>;
}
