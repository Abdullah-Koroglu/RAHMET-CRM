import { reconcileGoogleSource } from "@/app/actions";
import { z } from "zod";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { boundedQuery, single } from "@/lib/query";
import { TableSortLink } from "@/components/table-sort-link";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const q = boundedQuery(params.q);
  const status = z
    .enum(["ACTIVE", "PAUSED", "ERROR", "ARCHIVED"])
    .safeParse(single(params.status));
  const sort = z
    .enum(["course", "mode", "status", "retry", "success"])
    .catch("success")
    .parse(single(params.sort));
  const direction = z
    .enum(["asc", "desc"])
    .catch("desc")
    .parse(single(params.direction));
  const sources = await db.externalRegistrationSource.findMany({
    where: {
      ...(status.success ? { status: status.data } : {}),
      ...(q ? { course: { name: { contains: q, mode: "insensitive" } } } : {}),
    },
    include: { course: true },
    orderBy:
      sort === "course"
        ? { course: { name: direction } }
        : sort === "mode"
          ? { accessMode: direction }
        : sort === "status"
          ? { status: direction }
          : sort === "retry"
            ? { retryAttemptCount: direction }
          : { lastSuccessAt: direction },
  });
  const origin =
    process.env.APP_ORIGIN?.replace(/\/$/, "") ?? "https://RAHMET_CRM_DOMAIN";
  return (
    <div className="space-y-6">
      <PageHeader
        title="Entegrasyonlar"
        description="Kaynak sağlığı, retry durumu ve Apps Script webhook adresleri."
      />
      <Card>
        <CardContent className="pt-6">
          <form className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <div className="space-y-2">
              <label htmlFor="source-search" className="text-sm font-medium">
                Ders ara
              </label>
              <input
                id="source-search"
                name="q"
                defaultValue={q}
                className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="source-status" className="text-sm font-medium">
                Durum
              </label>
              <select
                id="source-status"
                name="status"
                defaultValue={status.success ? status.data : "ALL"}
                className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
              >
                <option value="ALL">Tümü</option>
                <option value="ACTIVE">Aktif</option>
                <option value="PAUSED">Duraklatıldı</option>
                <option value="ERROR">Hata</option>
                <option value="ARCHIVED">Arşiv</option>
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
                      pathname: "/entegrasyonlar",
                      query: {
                        q,
                        status: status.success ? status.data : "ALL",
                        sort: "course",
                        direction:
                          sort === "course" && direction === "asc"
                            ? "desc"
                            : "asc",
                      },
                    }}
                    active={sort === "course"}
                    direction={direction}
                  >
                    Ders
                  </TableSortLink>
                </TableHead>
                <TableHead>
                  <TableSortLink
                    href={{
                      pathname: "/entegrasyonlar",
                      query: {
                        q,
                        status: status.success ? status.data : "ALL",
                        sort: "mode",
                        direction: sort === "mode" && direction === "asc" ? "desc" : "asc",
                      },
                    }}
                    active={sort === "mode"}
                    direction={direction}
                  >
                    Mod
                  </TableSortLink>
                </TableHead>
                <TableHead>
                  <TableSortLink
                    href={{
                      pathname: "/entegrasyonlar",
                      query: {
                        q,
                        status: status.success ? status.data : "ALL",
                        sort: "status",
                        direction:
                          sort === "status" && direction === "asc"
                            ? "desc"
                            : "asc",
                      },
                    }}
                    active={sort === "status"}
                    direction={direction}
                  >
                    Durum
                  </TableSortLink>
                </TableHead>
                <TableHead>Webhook URL</TableHead>
                <TableHead>
                  <TableSortLink
                    href={{
                      pathname: "/entegrasyonlar",
                      query: {
                        q,
                        status: status.success ? status.data : "ALL",
                        sort: "retry",
                        direction: sort === "retry" && direction === "asc" ? "desc" : "asc",
                      },
                    }}
                    active={sort === "retry"}
                    direction={direction}
                  >
                    Retry
                  </TableSortLink>
                </TableHead>
                <TableHead>
                  <TableSortLink
                    href={{
                      pathname: "/entegrasyonlar",
                      query: {
                        q,
                        status: status.success ? status.data : "ALL",
                        sort: "success",
                        direction:
                          sort === "success" && direction === "asc"
                            ? "desc"
                            : "asc",
                      },
                    }}
                    active={sort === "success"}
                    direction={direction}
                  >
                    Son başarı
                  </TableSortLink>
                </TableHead>
                <TableHead>İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>{source.course.name}</TableCell>
                  <TableCell>
                    {source.accessMode === "WEBHOOK_ONLY"
                      ? "Özel / push"
                      : "Public CSV"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={source.status} />
                  </TableCell>
                  <TableCell className="max-w-md whitespace-normal break-all font-mono text-xs">
                    {origin}/api/integrations/google-forms/sources/{source.id}
                    /responses
                  </TableCell>
                  <TableCell>
                    {source.retryAttemptCount}/5 ·{" "}
                    {formatDate(source.nextRetryAt)}
                  </TableCell>
                  <TableCell>{formatDate(source.lastSuccessAt)}</TableCell>
                  <TableCell>
                    {source.accessMode === "PUBLIC_CSV" &&
                    source.status !== "ARCHIVED" ? (
                      <ActionForm action={reconcileGoogleSource}>
                        <input
                          type="hidden"
                          name="sourceId"
                          value={source.id}
                        />
                        <Button type="submit" size="sm" variant="outline">
                          Yeniden dene
                        </Button>
                      </ActionForm>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
