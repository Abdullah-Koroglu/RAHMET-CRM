import Link from "next/link";
import { Prisma } from "@prisma/client";
import { CreateWorkshopDialog } from "@/components/workshop-dialogs";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function WorkshopsPage() { const user = await getCurrentUser(); const workshops = await db.workshop.findMany({ include: { registrations: { include: { payments: true } } }, orderBy: { eventDate: "desc" } }); return <div className="space-y-6"><PageHeader title="Atölye & Workshop" description="Kadınlara yönelik etkinliklerin katılımcı ve tahsilat takibi." actions={user.role !== "VIEWER" ? <CreateWorkshopDialog /> : undefined} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{workshops.map(workshop => { const paid = workshop.registrations.reduce((sum, registration) => sum.plus(registration.payments.reduce((paymentSum, payment) => paymentSum.plus(payment.amount), new Prisma.Decimal(0))), new Prisma.Decimal(0)); return <Card key={workshop.id}><CardHeader><CardTitle>{workshop.title}</CardTitle><p className="text-sm text-muted-foreground">{formatDate(workshop.eventDate)} · Kişi başı {formatMoney(workshop.defaultFeeAmount)}</p></CardHeader><CardContent className="space-y-3"><p className="text-sm">Katılımcı: <span className="font-medium">{workshop.registrations.length}</span></p><p className="text-sm">Tahsil edilen: <span className="font-medium text-emerald-700">{formatMoney(paid)}</span></p><Button className="w-full" render={<Link href={`/atolyeler/${workshop.id}`} />}>Detayı aç</Button></CardContent></Card>; })}</div>{!workshops.length ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Henüz atölye veya workshop kaydı yok.</CardContent></Card> : null}</div>; }
