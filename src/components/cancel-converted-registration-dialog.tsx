"use client";

import { cancelConvertedPreRegistration } from "@/app/actions";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CancelConvertedRegistrationDialog({
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
      <DialogTrigger render={<Button variant="destructive" className="w-full" />}>
        Kesin kaydı iptal et
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kesin kaydı iptal et</DialogTitle>
          <DialogDescription>
            Öğrencinin bu dersteki aktif kaydı iptal edilir. Mevcut tahsilat ve işlem geçmişi silinmez.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium">{fullName}</p>
          <p className="text-muted-foreground">{courseName}</p>
        </div>
        <ActionForm action={cancelConvertedPreRegistration} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <div className="space-y-2">
            <Label htmlFor={`cancellation-reason-${id}`}>İptal nedeni</Label>
            <Textarea
              id={`cancellation-reason-${id}`}
              name="reason"
              maxLength={1000}
              placeholder="Örn. Katılmaktan vazgeçti"
              required
            />
          </div>
          <Button type="submit" variant="destructive" className="w-full">
            Kaydı iptal et
          </Button>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
