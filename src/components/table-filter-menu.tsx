"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Funnel } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FilterOption = { label: string; value: string };

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
  params: Record<string, string | number>;
  param: string;
  value: string;
  options: FilterOption[];
}) {
  const router = useRouter();
  const selectOption = (option: string) => {
    const query = new URLSearchParams(
      Object.entries(params).map(([key, item]) => [key, String(item)]),
    );
    query.set(param, option);
    query.set("page", "1");
    router.push(`${pathname}?${query.toString()}`);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`${label} filtresi`}
            size="icon-xs"
            variant={value === "ALL" ? "ghost" : "secondary"}
          />
        }
      >
        <Funnel />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuLabel>{label} filtresi</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => selectOption(option.value)}
          >
            <span className="flex-1">{option.label}</span>
            {value === option.value ? <span aria-hidden>✓</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
  params: Record<string, string | number>;
  param: string;
  value: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [term, setTerm] = useState(value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`${label} filtresi`}
            size="icon-xs"
            variant={value ? "secondary" : "ghost"}
          />
        }
      >
        <Funnel />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-3">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const query = new URLSearchParams(
              Object.entries(params).map(([key, item]) => [key, String(item)]),
            );
            query.set(param, term.trim());
            query.set("page", "1");
            router.push(`${pathname}?${query.toString()}`);
          }}
        >
          <label htmlFor={`${param}-filter`} className="text-sm font-medium">
            {label} ara
          </label>
          <input
            id={`${param}-filter`}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={placeholder}
            className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm">Uygula</Button>
            {value ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setTerm("");
                  const query = new URLSearchParams(
                    Object.entries(params).map(([key, item]) => [key, String(item)]),
                  );
                  query.set(param, "");
                  query.set("page", "1");
                  router.push(`${pathname}?${query.toString()}`);
                }}
              >
                Temizle
              </Button>
            ) : null}
          </div>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
