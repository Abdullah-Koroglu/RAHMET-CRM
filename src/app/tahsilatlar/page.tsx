import Link from "next/link";
import { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { TableSortLink } from "@/components/table-sort-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { formatMoney } from "@/lib/format";
import { boundedQuery, single } from "@/lib/query";
import { z } from "zod";

export const dynamic = "force-dynamic";

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await getCurrentUser();
  const params = await searchParams;
  const q = boundedQuery(params.q);
  const balanceFilter = z
    .enum(["DEBT", "CREDIT", "ZERO"])
    .safeParse(single(params.balance));
  const sort = z
    .enum(["student", "monthly", "balance", "collect"])
    .catch("collect")
    .parse(single(params.sort));
  const direction = z
    .enum(["asc", "desc"])
    .catch("desc")
    .parse(single(params.direction));
  const students = await db.student.findMany({
    where: { isActive: true },
    include: {
      enrollments: { where: { status: "ACTIVE" } },
      accountEntries: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  const rows = students.map((student) => {
    const monthlyExpected = student.enrollments.reduce(
      (sum, enrollment) => sum.plus(enrollment.agreedFeeAmount),
      new Prisma.Decimal(0),
    );
    const balance = student.accountEntries.reduce(
      (sum, entry) => sum.plus(entry.amount),
      new Prisma.Decimal(0),
    );
    const toCollect = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      monthlyExpected.minus(balance),
    );
    return { ...student, monthlyExpected, balance, toCollect };
  });
  const filteredRows = rows
    .filter((row) => {
      const fullName = `${row.firstName} ${row.lastName}`.toLocaleLowerCase("tr-TR");
      if (q && !fullName.includes(q.toLocaleLowerCase("tr-TR"))) return false;
      if (balanceFilter.data === "DEBT") return row.balance.lessThan(0);
      if (balanceFilter.data === "CREDIT") return row.balance.greaterThan(0);
      if (balanceFilter.data === "ZERO") return row.balance.equals(0);
      return true;
    })
    .sort((left, right) => {
      const multiplier = direction === "asc" ? 1 : -1;
      if (sort === "student") {
        return multiplier * `${left.firstName} ${left.lastName}`.localeCompare(
          `${right.firstName} ${right.lastName}`,
          "tr",
        );
      }
      const field =
        sort === "monthly"
          ? "monthlyExpected"
          : sort === "balance"
            ? "balance"
            : "toCollect";
      return multiplier * left[field].comparedTo(right[field]);
    });
  const total = filteredRows.reduce(
    (sum, row) => sum.plus(row.toCollect),
    new Prisma.Decimal(0),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tahsilatlar"
        description="Aktif derslerin aylık ücretleri ve mevcut öğrenci bakiyesine göre tahsil edilmesi gereken tutarlar."
      />
      <Card>
        <CardContent className="pt-6">
          <div className="mb-5 grid gap-2 rounded-lg border p-4 sm:grid-cols-2">
            <p className="text-sm text-muted-foreground">
              Bugün tahsil edilmesi gereken toplam
            </p>
            <p className="text-right text-2xl font-semibold">
              {formatMoney(total)}
            </p>
          </div>
          <form className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <div className="space-y-2">
              <label htmlFor="collection-search" className="text-sm font-medium">
                Öğrenci ara
              </label>
              <Input id="collection-search" name="q" defaultValue={q} />
            </div>
            <div className="space-y-2">
              <label htmlFor="balance-filter" className="text-sm font-medium">
                Bakiye durumu
              </label>
              <select
                id="balance-filter"
                name="balance"
                defaultValue={balanceFilter.success ? balanceFilter.data : "ALL"}
                className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
              >
                <option value="ALL">Tümü</option>
                <option value="DEBT">Borçlu</option>
                <option value="CREDIT">Alacaklı</option>
                <option value="ZERO">Bakiyesi sıfır</option>
              </select>
            </div>
            <Button type="submit">Filtrele</Button>
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  ["student", "Öğrenci"],
                  ["monthly", "Aylık beklenen"],
                  ["balance", "Mevcut bakiye"],
                  ["collect", "Tahsil edilecek"],
                ].map(([value, label]) => (
                  <TableHead
                    key={value}
                    className={value === "student" ? undefined : "text-right"}
                  >
                    <TableSortLink
                      href={{
                        pathname: "/tahsilatlar",
                        query: {
                          q,
                          balance: balanceFilter.success ? balanceFilter.data : "ALL",
                          sort: value,
                          direction:
                            sort === value && direction === "asc" ? "desc" : "asc",
                        },
                      }}
                      active={sort === value}
                      direction={direction}
                    >
                      {label}
                    </TableSortLink>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      className="font-medium hover:underline"
                      href={`/ogrenciler/${row.id}`}
                    >
                      {row.firstName} {row.lastName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(row.monthlyExpected)}
                  </TableCell>
                  <TableCell
                    className={
                      row.balance.greaterThanOrEqualTo(0)
                        ? "text-right text-emerald-700"
                        : "text-right text-destructive"
                    }
                  >
                    {formatMoney(row.balance)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(row.toCollect)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!filteredRows.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Seçilen filtrelere uygun aktif öğrenci bulunamadı.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
