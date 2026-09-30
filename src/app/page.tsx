import { AlertCircle, BookOpen, GraduationCap, UserRoundCheck } from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { formatDate, statusLabels } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await getCurrentUser();
  const [students, courses, pending, sourceErrors, latest] = await Promise.all([
    db.student.count({ where: { isActive: true } }), db.course.count({ where: { status: "ACTIVE" } }),
    db.preRegistration.count({ where: { status: { in: ["NEW", "IN_REVIEW", "CONTACTED", "APPROVED"] } } }),
    db.externalRegistrationSource.count({ where: { status: "ERROR" } }),
    db.preRegistration.findMany({ take: 6, orderBy: { receivedAt: "desc" }, include: { course: true } }),
  ]);
  const stats = [{ label: "Aktif öğrenci", value: students, icon: GraduationCap }, { label: "Aktif ders", value: courses, icon: BookOpen }, { label: "Bekleyen ön kayıt", value: pending, icon: UserRoundCheck }, { label: "Kaynak hatası", value: sourceErrors, icon: AlertCircle }];
  return <div className="space-y-6"><PageHeader title="Genel görünüm" description="Kayıt, ders ve entegrasyon durumlarının güncel özeti." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <Card key={label}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle><Icon className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-3xl font-semibold">{value}</div></CardContent></Card>)}</div><Card><CardHeader><CardTitle>Son ön kayıtlar</CardTitle></CardHeader><CardContent className="space-y-3">{latest.length ? latest.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border p-3"><div><p className="font-medium">{item.fullName}</p><p className="text-sm text-muted-foreground">{item.course.name} · {formatDate(item.receivedAt)}</p></div><Badge variant="outline">{statusLabels[item.status]}</Badge></div>) : <p className="text-sm text-muted-foreground">Henüz ön kayıt yok.</p>}</CardContent></Card></div>;
}
