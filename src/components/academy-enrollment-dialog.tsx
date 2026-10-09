"use client";

import { createAcademyEnrollment, recordAcademyPayment } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AcademyEnrollmentDialog({ academy, academyName }: { academy: "PRIMARY" | "MIDDLE" | "HIGH"; academyName: string }) {
  return <Dialog><DialogTrigger render={<Button />}>Öğrenci ekle</DialogTrigger><DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{academyName} kaydı</DialogTitle><DialogDescription>Ders bilgisi olmadan öğrenci, veli ve toplam akademi ücreti kaydedilir.</DialogDescription></DialogHeader><ActionForm action={createAcademyEnrollment} className="grid gap-4 sm:grid-cols-2"><input type="hidden" name="academy" value={academy} /><div className="sm:col-span-2"><p className="text-sm font-medium">Öğrenci bilgileri</p></div><Field label="Öğrenci adı" name="firstName" required /><Field label="Öğrenci soyadı" name="lastName" required /><Field label="Öğrenci telefonu" name="studentPhone" type="tel" placeholder="Opsiyonel" /><Field label="Sınıf seviyesi" name="classLevel" placeholder="Örn. 5. sınıf" /><div className="sm:col-span-2 mt-2"><p className="text-sm font-medium">Veli bilgileri</p></div><Field label="Veli adı" name="guardianFirstName" required /><Field label="Veli soyadı" name="guardianLastName" required /><Field label="Yakınlık derecesi" name="guardianRelationship" placeholder="Anne, baba, vasi…" required /><Field label="Veli telefonu" name="guardianPhone" type="tel" required /><div className="sm:col-span-2 mt-2"><Field label="Toplam akademi ücreti (TL)" name="feeAmount" type="number" min="0" step="0.01" required /></div><div className="sm:col-span-2"><Button type="submit" className="w-full">Kaydı oluştur</Button></div></ActionForm></DialogContent></Dialog>;
}

export function AcademyPaymentDialog({ enrollmentId, studentName }: { enrollmentId: string; studentName: string }) {
  return <Dialog><DialogTrigger render={<Button variant="outline" size="sm" />}>Ödeme al</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Akademi ödemesi</DialogTitle><DialogDescription>{studentName} için tahsilat kaydı oluşturun.</DialogDescription></DialogHeader><ActionForm action={recordAcademyPayment} className="grid gap-4"><input type="hidden" name="enrollmentId" value={enrollmentId} /><Field label="Tutar (TL)" name="amount" type="number" min="0.01" step="0.01" required /><Field label="Ödeme tarihi" name="paidOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /><div className="space-y-2"><Label htmlFor={`payment-note-${enrollmentId}`}>Not</Label><Input id={`payment-note-${enrollmentId}`} name="note" maxLength={500} placeholder="Opsiyonel" /></div><Button type="submit">Ödemeyi kaydet</Button></ActionForm></DialogContent></Dialog>;
}

function Field({ label, name, type = "text", required = false, placeholder, min, step, defaultValue }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; min?: string; step?: string; defaultValue?: string }) {
  const id = `academy-${name}`;
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} name={name} type={type} required={required} placeholder={placeholder} min={min} step={step} defaultValue={defaultValue} maxLength={type === "number" || type === "date" ? undefined : 100} /></div>;
}
