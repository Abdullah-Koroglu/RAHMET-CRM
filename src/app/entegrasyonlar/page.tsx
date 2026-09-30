import { reconcileGoogleSource } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  await requireRole(["ADMIN"]);
  const sources = await db.externalRegistrationSource.findMany({ include: { course: true }, orderBy: { createdAt: "desc" } });
  const origin = process.env.APP_ORIGIN?.replace(/\/$/, "") ?? "https://RAHMET_CRM_DOMAIN";
  return <div className="space-y-6"><PageHeader title="Entegrasyonlar" description="Kaynak sağlığı, retry durumu ve Apps Script webhook adresleri." /><Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Ders</TableHead><TableHead>Mod</TableHead><TableHead>Durum</TableHead><TableHead>Webhook URL</TableHead><TableHead>Retry</TableHead><TableHead>Son başarı</TableHead><TableHead>İşlem</TableHead></TableRow></TableHeader><TableBody>{sources.map((source) => <TableRow key={source.id}><TableCell>{source.course.name}</TableCell><TableCell>{source.accessMode === "WEBHOOK_ONLY" ? "Özel / push" : "Public CSV"}</TableCell><TableCell><StatusBadge status={source.status} /></TableCell><TableCell className="max-w-md whitespace-normal break-all font-mono text-xs">{origin}/api/integrations/google-forms/sources/{source.id}/responses</TableCell><TableCell>{source.retryAttemptCount}/5 · {formatDate(source.nextRetryAt)}</TableCell><TableCell>{formatDate(source.lastSuccessAt)}</TableCell><TableCell>{source.accessMode === "PUBLIC_CSV" && source.status !== "ARCHIVED" ? <ActionForm action={reconcileGoogleSource}><input type="hidden" name="sourceId" value={source.id} /><Button type="submit" size="sm" variant="outline">Yeniden dene</Button></ActionForm> : "—"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div>;
}
