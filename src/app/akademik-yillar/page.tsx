import { createAcademicYear } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function YearsPage() {
  const user = await getCurrentUser();
  const years = await db.academicYear.findMany({ include: { _count: { select: { courses: true } } }, orderBy: { startDate: "desc" } });
  return <div className="space-y-6"><PageHeader title="Akademik yıllar" description="Dersleri dönemler altında yönetin." /><div className="grid gap-6 xl:grid-cols-[1fr_360px]"><Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Dönem</TableHead><TableHead>Başlangıç</TableHead><TableHead>Bitiş</TableHead><TableHead>Durum</TableHead><TableHead>Ders</TableHead></TableRow></TableHeader><TableBody>{years.map((year) => <TableRow key={year.id}><TableCell className="font-medium">{year.displayName}</TableCell><TableCell>{year.startDate.toLocaleDateString("tr-TR")}</TableCell><TableCell>{year.endDate.toLocaleDateString("tr-TR")}</TableCell><TableCell><StatusBadge status={year.status} /></TableCell><TableCell>{year._count.courses}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>{user.role === "ADMIN" ? <Card><CardHeader><CardTitle>Yeni akademik yıl</CardTitle></CardHeader><CardContent><ActionForm action={createAcademicYear} className="space-y-4"><div className="space-y-2"><Label htmlFor="displayName">Görünen ad</Label><Input id="displayName" name="displayName" placeholder="2027-2028" maxLength={50} required /></div><div className="space-y-2"><Label htmlFor="startDate">Başlangıç</Label><Input id="startDate" name="startDate" type="date" required /></div><div className="space-y-2"><Label htmlFor="endDate">Bitiş</Label><Input id="endDate" name="endDate" type="date" required /></div><Button type="submit">Dönem ekle</Button></ActionForm></CardContent></Card> : null}</div></div>;
}
