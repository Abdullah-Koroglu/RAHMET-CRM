"use client";

import { reverseStudentPayment, updateStudentPayment } from "@/app/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PaymentActionsDialog({
  entryId,
  studentId,
  amount,
  paidOn,
}: {
  entryId: string;
  studentId: string;
  amount: string;
  paidOn: string;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Düzenle
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ödemeyi düzenle</DialogTitle>
          <DialogDescription>
            Tutar veya tarih hatalıysa güncelleyin. İptal, kaydı silmez; bakiye için ters ödeme kaydı oluşturur.
          </DialogDescription>
        </DialogHeader>
        <ActionForm action={updateStudentPayment} className="space-y-3">
          <input type="hidden" name="entryId" value={entryId} />
          <input type="hidden" name="studentId" value={studentId} />
          <div className="space-y-2">
            <Label htmlFor={`payment-amount-${entryId}`}>Tutar (TL)</Label>
            <Input
              id={`payment-amount-${entryId}`}
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={amount}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`payment-date-${entryId}`}>Ödeme tarihi</Label>
            <Input id={`payment-date-${entryId}`} name="paidOn" type="date" defaultValue={paidOn} required />
          </div>
          <Button type="submit" className="w-full">Değişiklikleri kaydet</Button>
        </ActionForm>
        <ActionForm action={reverseStudentPayment} className="border-t pt-4">
          <input type="hidden" name="entryId" value={entryId} />
          <input type="hidden" name="studentId" value={studentId} />
          <Button type="submit" variant="destructive" className="w-full">Ödemeyi iptal et</Button>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
