import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function href(basePath: string, params: Record<string, string>, page: number, pageSize: number) {
  const query = new URLSearchParams({ ...params, page: String(page), pageSize: String(pageSize) });
  return `${basePath}?${query.toString()}`;
}

export function Pagination({ basePath, params, page, pageSize, total }: { basePath: string; params: Record<string, string>; page: number; pageSize: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const shownPages = Array.from(
    new Set([1, current - 1, current, current + 1, pages].filter((item) => item >= 1 && item <= pages)),
  ).sort((left, right) => left - right);
  return (
    <nav aria-label="Sayfalama" className="mt-5 flex flex-col gap-3 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm text-muted-foreground">{total} kayıt içinden {total ? (current - 1) * pageSize + 1 : 0}–{Math.min(current * pageSize, total)} gösteriliyor</p>
      <div className="flex flex-wrap items-center gap-2">
        <form action={basePath} className="flex items-center gap-2">
          {Object.entries(params).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          <label htmlFor="page-size" className="text-xs text-muted-foreground">Sayfa başına</label>
          <select id="page-size" name="pageSize" defaultValue={pageSize} className="h-7 rounded-lg border bg-transparent px-2 text-xs">
            {[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "xs" }))}>Uygula</button>
        </form>
        {current > 1 ? <Link href={href(basePath, params, current - 1, pageSize)} className={buttonVariants({ variant: "outline", size: "sm" })}>Önceki</Link> : null}
        {shownPages.map((item, index) => (
          <span key={item} className="flex items-center gap-2">
            {index > 0 && item - shownPages[index - 1] > 1 ? <span className="text-muted-foreground">…</span> : null}
            <Link href={href(basePath, params, item, pageSize)} aria-current={item === current ? "page" : undefined} className={cn(buttonVariants({ variant: item === current ? "secondary" : "outline", size: "sm" }))}>{item}</Link>
          </span>
        ))}
        {current < pages ? <Link href={href(basePath, params, current + 1, pageSize)} className={buttonVariants({ variant: "outline", size: "sm" })}>Sonraki</Link> : null}
      </div>
    </nav>
  );
}
