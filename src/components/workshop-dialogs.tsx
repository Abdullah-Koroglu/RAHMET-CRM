"use client";

import { addWorkshopParticipant, createWorkshop, recordWorkshopPayment } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateWorkshopDialog() {
  return <Dialog><DialogTrigger render={<Button />}>Yeni atölye / workshop</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Kadınlara yönelik atölye oluştur</DialogTitle><DialogDescription>Etkinlik ücreti katılımcı eklerken otomatik gelir, isterseniz kişi bazında değiştirebilirsiniz.</DialogDescription></DialogHeader><ActionForm action={createWorkshop} className="grid gap-4"><Field label="Atölye adı" name="title" required placeholder="Örn. Seramik workshop" /><Field label="Tarih" name="eventDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /><Field label="Kişi başı ücret (TL)" name="defaultFeeAmount" type="number" min="0" step="0.01" required /><div className="space-y-2"><Label htmlFor="workshop-description">Açıklama</Label><Input id="workshop-description" name="description" maxLength={500} placeholder="Opsiyonel" /></div><Button type="submit">Atölyeyi oluştur</Button></ActionForm></DialogContent></Dialog>;
}

export function AddWorkshopParticipantDialog({ workshopId, defaultFeeAmount }: { workshopId: string; defaultFeeAmount: string }) {
  return <Dialog><DialogTrigger render={<Button />}>Dışarıdan katılımcı ekle</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Katılımcı ekle</DialogTitle><DialogDescription>Öğrenci kaydı olmayan dışarıdan katılımcıları da ekleyebilirsiniz.</DialogDescription></DialogHeader><ActionForm action={addWorkshopParticipant} className="grid gap-4"><input type="hidden" name="workshopId" value={workshopId} /><Field label="Ad soyad" name="participantName" required /><Field label="Telefon" name="participantPhone" type="tel" placeholder="Opsiyonel" /><Field label="Katılım ücreti (TL)" name="expectedAmount" type="number" min="0" step="0.01" required defaultValue={defaultFeeAmount} /><Button type="submit">Katılımcıyı ekle</Button></ActionForm></DialogContent></Dialog>;
}

export function WorkshopPaymentDialog({ registrationId, participantName }: { registrationId: string; participantName: string }) {
  return <Dialog><DialogTrigger render={<Button variant="outline" size="sm" />}>Ödeme al</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Atölye ödemesi</DialogTitle><DialogDescription>{participantName} için ödeme kaydedin.</DialogDescription></DialogHeader><ActionForm action={recordWorkshopPayment} className="grid gap-4"><input type="hidden" name="registrationId" value={registrationId} /><Field label="Tutar (TL)" name="amount" type="number" min="0.01" step="0.01" required /><Field label="Ödeme tarihi" name="paidOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /><div className="space-y-2"><Label htmlFor={`workshop-note-${registrationId}`}>Not</Label><Input id={`workshop-note-${registrationId}`} name="note" maxLength={500} placeholder="Opsiyonel" /></div><Button type="submit">Ödemeyi kaydet</Button></ActionForm></DialogContent></Dialog>;
}

function Field({ label, name, type = "text", required = false, placeholder, min, step, defaultValue }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; min?: string; step?: string; defaultValue?: string }) { const id = `workshop-${name}`; return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} name={name} type={type} required={required} placeholder={placeholder} min={min} step={step} defaultValue={defaultValue} maxLength={type === "number" || type === "date" ? undefined : 200} /></div>; }
