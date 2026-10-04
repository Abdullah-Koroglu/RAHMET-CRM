"use client";

import { convertPreRegistration } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ConvertPreRegistrationDialog({
  id,
  fullName,
  courseName,
}: {
  id: string;
  fullName: string;
  courseName: string;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button className="w-full" />}>
        Kesin kayda dönüştür
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kesin kaydı onayla</DialogTitle>
          <DialogDescription>
            Bu işlem öğrenci profili ve aktif ders kaydı oluşturur. Ön kayıt
            durumu “Kesin kayda dönüştü” olur.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium">{fullName}</p>
          <p className="text-muted-foreground">{courseName}</p>
        </div>
        <ActionForm action={convertPreRegistration} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <Button type="submit" className="w-full">
            Onayla ve kesin kayda dönüştür
          </Button>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
