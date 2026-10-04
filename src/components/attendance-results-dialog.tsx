"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AttendanceResultsDialog({
  date,
  entries,
}: {
  date: string;
  entries: { id: string; name: string; status: "PRESENT" | "ABSENT" }[];
}) {
  const present = entries.filter((entry) => entry.status === "PRESENT");
  const absent = entries.filter((entry) => entry.status === "ABSENT");
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Yoklamayı gör
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Yoklama sonucu</DialogTitle>
          <DialogDescription>
            {date} · {present.length} katıldı, {absent.length} katılmadı
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <section>
            <p className="mb-2 text-sm font-medium text-emerald-700">
              Katılanlar
            </p>
            <ul className="space-y-1 text-sm">
              {present.map((entry) => (
                <li key={entry.id}>{entry.name}</li>
              ))}
              {!present.length ? (
                <li className="text-muted-foreground">Kayıt yok.</li>
              ) : null}
            </ul>
          </section>
          <section>
            <p className="mb-2 text-sm font-medium text-destructive">
              Katılmayanlar
            </p>
            <ul className="space-y-1 text-sm">
              {absent.map((entry) => (
                <li key={entry.id}>{entry.name}</li>
              ))}
              {!absent.length ? (
                <li className="text-muted-foreground">Kayıt yok.</li>
              ) : null}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
