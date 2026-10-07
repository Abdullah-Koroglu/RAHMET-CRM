"use client";

import { useState } from "react";
import { recordStudentPayment } from "@/app/actions";
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
import { Textarea } from "@/components/ui/textarea";

function lastDayOfMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

export function StudentPaymentDialog({
  studentId,
  studentName,
  currentMonth,
}: {
  studentId: string;
  studentName: string;
  currentMonth: string;
}) {
  const [paymentRequestId] = useState(() => crypto.randomUUID());
  const [month, setMonth] = useState(currentMonth);
  const [paidOn, setPaidOn] = useState(`${currentMonth}-01`);

  return (
    <Dialog>
      <DialogTrigger render={<Button className="w-full" />}>
        Ödeme gir
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ödeme gir</DialogTitle>
          <DialogDescription>
            {studentName} için ödeme ilgili aya kaydedilir. O ayda tahakkuk
            varsa otomatik olarak bağlanır.
          </DialogDescription>
        </DialogHeader>
        <ActionForm action={recordStudentPayment} className="space-y-3">
            <input type="hidden" name="studentId" value={studentId} />
            <input type="hidden" name="paymentRequestId" value={paymentRequestId} />
            <div className="space-y-2">
              <Label htmlFor={`student-payment-month-${studentId}`}>İlgili ay</Label>
              <Input
                id={`student-payment-month-${studentId}`}
                name="month"
                type="month"
                value={month}
                onChange={(event) => {
                  setMonth(event.target.value);
                  setPaidOn(`${event.target.value}-01`);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`student-payment-amount-${studentId}`}>Tutar (TL)</Label>
              <Input id={`student-payment-amount-${studentId}`} name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`student-payment-date-${studentId}`}>Ödeme tarihi</Label>
              <Input
                id={`student-payment-date-${studentId}`}
                name="paidOn"
                type="date"
                min={`${month}-01`}
                max={lastDayOfMonth(month)}
                value={paidOn}
                onChange={(event) => setPaidOn(event.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Tahakkuk tanımlı değilse ödeme yine kaydedilir; bu ay için
                beklenen borç hesaplanmaz.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`student-payment-note-${studentId}`}>Açıklama</Label>
              <Textarea id={`student-payment-note-${studentId}`} name="note" maxLength={500} rows={3} placeholder="Ödeme açıklaması" />
            </div>
            <Button type="submit" className="w-full">
              Ödemeyi kaydet
            </Button>
          </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
