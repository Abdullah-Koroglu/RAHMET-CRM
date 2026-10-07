"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

type MonthlyCharge = {
  id: string;
  billingMonth: string;
  expectedAmount: string;
};

function lastDayOfMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

export function StudentPaymentDialog({
  studentId,
  studentName,
  charges,
  isAdmin,
  currentMonth,
}: {
  studentId: string;
  studentName: string;
  charges: MonthlyCharge[];
  isAdmin: boolean;
  currentMonth: string;
}) {
  const currentCharge = charges.find((charge) => charge.billingMonth === currentMonth);
  const [monthlyChargeId, setMonthlyChargeId] = useState(currentCharge?.id ?? "");
  const selectedCharge = useMemo(
    () => charges.find((charge) => charge.id === monthlyChargeId),
    [charges, monthlyChargeId],
  );
  const [paymentRequestId] = useState(() => crypto.randomUUID());
  const selectedMonth = selectedCharge?.billingMonth ?? currentMonth;
  const [paidOn, setPaidOn] = useState(`${selectedMonth}-01`);

  return (
    <Dialog>
      <DialogTrigger render={<Button className="w-full" />}>
        Ödeme gir
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ödeme gir</DialogTitle>
          <DialogDescription>
            {studentName} için ödeme, seçilen aylık tahakkuka bağlanır.
          </DialogDescription>
        </DialogHeader>
        {!charges.length ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Bu öğrenci için henüz aylık tahakkuk yok. Tahakkuk olmadan ödeme
              kaydı oluşturulamaz.
            </p>
            {isAdmin ? (
              <Button className="w-full" variant="outline" render={<Link href={`/tahsilatlar?month=${currentMonth}`} />}>
                Tahsilatlardan tahakkuk oluştur
              </Button>
            ) : null}
          </div>
        ) : (
          <ActionForm action={recordStudentPayment} className="space-y-3">
            <input type="hidden" name="studentId" value={studentId} />
            <input type="hidden" name="monthlyChargeId" value={monthlyChargeId} />
            <input type="hidden" name="paymentRequestId" value={paymentRequestId} />
            <div className="space-y-2">
              <Label htmlFor={`student-charge-${studentId}`}>Tahakkuk ayı</Label>
              <select
                id={`student-charge-${studentId}`}
                value={monthlyChargeId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  const nextCharge = charges.find((charge) => charge.id === nextId);
                  setMonthlyChargeId(nextId);
                  if (nextCharge) setPaidOn(`${nextCharge.billingMonth}-01`);
                }}
                className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm"
                required
              >
                <option value="" disabled>Tahakkuk seçin</option>
                {charges.map((charge) => (
                  <option key={charge.id} value={charge.id}>
                    {charge.billingMonth} · {Number(charge.expectedAmount).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                  </option>
                ))}
              </select>
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
                min={`${selectedMonth}-01`}
                max={lastDayOfMonth(selectedMonth)}
                value={paidOn}
                onChange={(event) => setPaidOn(event.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Tarih seçilen tahakkuk ayı içinde olmalıdır.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={!monthlyChargeId}>
              Ödemeyi kaydet
            </Button>
          </ActionForm>
        )}
      </DialogContent>
    </Dialog>
  );
}
