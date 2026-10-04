import Link from "next/link";

type Direction = "asc" | "desc";

export function TableSortLink({
  href,
  active,
  direction,
  children,
}: {
  href: { pathname: string; query: Record<string, string | number> };
  active: boolean;
  direction: Direction;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
    >
      {children}
      <span
        aria-hidden
        className={active ? "text-foreground" : "text-muted-foreground"}
      >
        {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </Link>
  );
}
