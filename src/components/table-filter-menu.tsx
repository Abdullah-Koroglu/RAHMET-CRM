import { Funnel } from "lucide-react";
import { Button } from "@/components/ui/button";

type FilterOption = { label: string; value: string };
type Query = Record<string, string | number>;

function PreservedQuery({
  params,
  omitted,
}: {
  params: Query;
  omitted: string;
}) {
  return (
    <>
      {Object.entries(params)
        .filter(([key]) => key !== omitted && key !== "page")
        .map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
      <input type="hidden" name="page" value="1" />
    </>
  );
}

export function TableFilterMenu({
  label,
  pathname,
  params,
  param,
  value,
  options,
}: {
  label: string;
  pathname: string;
  params: Query;
  param: string;
  value: string;
  options: FilterOption[];
}) {
  return (
    <details className="relative inline-block align-middle">
      <summary
        aria-label={`${label} filtresi`}
        className={`inline-flex size-6 cursor-pointer list-none items-center justify-center rounded-md hover:bg-muted [&::-webkit-details-marker]:hidden ${value === "ALL" ? "" : "bg-secondary text-secondary-foreground"}`}
      >
        <Funnel />
      </summary>
      <form
        action={pathname}
        className="absolute left-0 z-50 mt-2 w-56 space-y-3 rounded-lg border bg-popover p-3 text-popover-foreground shadow-md"
      >
        <PreservedQuery params={params} omitted={param} />
        <label className="block space-y-1 text-sm font-medium">
          <span>{label} filtresi</span>
          <select
            name={param}
            defaultValue={value}
            className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm" className="w-full">
          Uygula
        </Button>
      </form>
    </details>
  );
}

export function TableSearchFilterMenu({
  label,
  pathname,
  params,
  param,
  value,
  placeholder,
}: {
  label: string;
  pathname: string;
  params: Query;
  param: string;
  value: string;
  placeholder: string;
}) {
  return (
    <details className="relative inline-block align-middle">
      <summary
        aria-label={`${label} filtresi`}
        className={`inline-flex size-6 cursor-pointer list-none items-center justify-center rounded-md hover:bg-muted [&::-webkit-details-marker]:hidden ${value ? "bg-secondary text-secondary-foreground" : ""}`}
      >
        <Funnel />
      </summary>
      <form
        action={pathname}
        className="absolute left-0 z-50 mt-2 w-64 space-y-3 rounded-lg border bg-popover p-3 text-popover-foreground shadow-md"
      >
        <PreservedQuery params={params} omitted={param} />
        <label className="block space-y-1 text-sm font-medium">
          <span>{label} ara</span>
          <input
            name={param}
            defaultValue={value}
            placeholder={placeholder}
            maxLength={100}
            className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
          />
        </label>
        <Button type="submit" size="sm">Uygula</Button>
      </form>
    </details>
  );
}
