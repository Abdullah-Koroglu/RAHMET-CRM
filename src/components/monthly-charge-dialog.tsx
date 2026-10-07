"use client";

import { useState } from "react";

import {
  createMonthlyChargesForActiveStudents,
  recordStudentPayment,
  upsertStudentMonthlyCharge,
} from "@/app/actions";
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

export function MonthlyChargeDialog({
  studentId,
  studentName,
  month,
  expectedAmount,
  note,
}: {
  studentId: string;
  studentName: string;
  month: string;
  expectedAmount?: string;
  note?: string | null;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        {expectedAmount === undefined ? "Tahakkuk ekle" : "Tahakkuku düzenle"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aylık tahakkuk</DialogTitle>
          <DialogDescription>{studentName} · {month}</DialogDescription>
        </DialogHeader>
        <ActionForm action={upsertStudentMonthlyCharge} className="space-y-3">
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="month" value={month} />
          <div className="space-y-2">
            <Label htmlFor={`charge-amount-${studentId}`}>Aylık beklenen (TL)</Label>
            <Input id={`charge-amount-${studentId}`} name="expectedAmount" type="number" min="0" step="0.01" defaultValue={expectedAmount ?? "0"} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`charge-note-${studentId}`}>Not</Label>
            <Textarea id={`charge-note-${studentId}`} name="note" defaultValue={note ?? ""} maxLength={500} rows={3} />
          </div>
          <Button type="submit" className="w-full">Tahakkuku kaydet</Button>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

export function MonthlyPaymentDialog({
  studentId,
  studentName,
  monthlyChargeId,
  month,
  today,
}: {
  studentId: string;
  studentName: string;
  monthlyChargeId: string;
  month: string;
  today: string;
}) {
  const [paymentRequestId] = useState(() => crypto.randomUUID());
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>
        Ödeme ekle
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aylık ödeme ekle</DialogTitle>
          <DialogDescription>{studentName} · {month} tahakkukuna işlenir.</DialogDescription>
        </DialogHeader>
        <ActionForm action={recordStudentPayment} className="space-y-3">
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="monthlyChargeId" value={monthlyChargeId} />
          <input type="hidden" name="paymentRequestId" value={paymentRequestId} />
          <div className="space-y-2">
            <Label htmlFor={`monthly-payment-amount-${studentId}`}>Alınan ödeme (TL)</Label>
            <Input id={`monthly-payment-amount-${studentId}`} name="amount" type="number" min="0.01" step="0.01" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`monthly-payment-date-${studentId}`}>Ödeme tarihi</Label>
            <Input id={`monthly-payment-date-${studentId}`} name="paidOn" type="date" defaultValue={today} required />
          </div>
          <Button type="submit" className="w-full">Ödemeyi kaydet</Button>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

export function BulkMonthlyChargeDialog({ month }: { month: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Toplu tahakkuk oluştur</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Toplu aylık tahakkuk</DialogTitle>
          <DialogDescription>
            {month} için aktif öğrencilerde yalnızca eksik tahakkuklar oluşturulur; mevcut tutarlar değişmez.
          </DialogDescription>
        </DialogHeader>
        <ActionForm action={createMonthlyChargesForActiveStudents} className="space-y-3">
          <input type="hidden" name="month" value={month} />
          <div className="space-y-2">
            <Label htmlFor="bulk-charge-amount">Kişi başı aylık beklenen (TL)</Label>
            <Input id="bulk-charge-amount" name="expectedAmount" type="number" min="0" step="0.01" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-charge-note">Not</Label>
            <Textarea id="bulk-charge-note" name="note" maxLength={500} rows={3} />
          </div>
          <Button type="submit" className="w-full">Eksik tahakkukları oluştur</Button>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
