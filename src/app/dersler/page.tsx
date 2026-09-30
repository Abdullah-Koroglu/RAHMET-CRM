import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const user = await getCurrentUser();
  const courses = await db.course.findMany({ include: { academicYear: true, teacher: true, sources: { where: { status: { not: "ARCHIVED" } }, orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { enrollments: true, preRegistrations: true } } }, orderBy: { name: "asc" } });
  return <div className="space-y-6"><PageHeader title="Dersler" description="Dersleri ve Google Forms kayıt kaynaklarını yönetin." actions={user.role === "ADMIN" ? <Link href="/dersler/yeni" className={buttonVariants()}><Plus />Yeni ders</Link> : null} /><Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Ders</TableHead><TableHead>Dönem</TableHead><TableHead>Eğitmen</TableHead><TableHead>Ücret</TableHead><TableHead>Kaynak</TableHead><TableHead>Kayıtlar</TableHead></TableRow></TableHeader><TableBody>{courses.map((course) => { const source = course.sources[0]; return <TableRow key={course.id}><TableCell><Link className="font-medium hover:underline" href={`/dersler/${course.id}`}>{course.name}</Link></TableCell><TableCell>{course.academicYear.displayName}</TableCell><TableCell>{course.teacher.firstName} {course.teacher.lastName}</TableCell><TableCell>{formatMoney(course.studentFeeAmount)}</TableCell><TableCell>{source ? <StatusBadge status={source.status} /> : <span className="text-muted-foreground">Bağlı değil</span>}</TableCell><TableCell>{course._count.enrollments} kesin / {course._count.preRegistrations} ön</TableCell></TableRow>; })}</TableBody></Table></CardContent></Card></div>;
}
