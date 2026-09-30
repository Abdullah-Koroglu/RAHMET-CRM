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
  return (
    <nav aria-label="Sayfalama" className="mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">Toplam {total} kayıt · Sayfa {current}/{pages}</p>
      <div className="flex flex-wrap items-center gap-2">
        {[25, 50, 100].map((size) => <Link key={size} href={href(basePath, params, 1, size)} aria-current={pageSize === size ? "page" : undefined} className={cn(buttonVariants({ variant: pageSize === size ? "secondary" : "outline", size: "sm" }))}>{size}</Link>)}
        {current > 1 ? <Link href={href(basePath, params, current - 1, pageSize)} className={buttonVariants({ variant: "outline", size: "sm" })}>Önceki</Link> : null}
        {current < pages ? <Link href={href(basePath, params, current + 1, pageSize)} className={buttonVariants({ variant: "outline", size: "sm" })}>Sonraki</Link> : null}
      </div>
    </nav>
  );
}
