"use client";

import { updateStudentProfile } from "@/app/actions";
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

type StudentProfile = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  birthDate: Date | null;
  district: string | null;
  address: string | null;
  classLevel: string | null;
};

export function StudentProfileDialog({ student }: { student: StudentProfile }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Profili düzenle
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Öğrenci profilini düzenle</DialogTitle>
          <DialogDescription>
            Ders kayıtları ve mali hareketler bu formdan değiştirilmez. Ortak aile
            telefon numaraları kullanılabilir.
          </DialogDescription>
        </DialogHeader>
        <ActionForm action={updateStudentProfile} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="studentId" value={student.id} />
          <div className="space-y-2">
            <Label htmlFor={`student-first-name-${student.id}`}>Ad</Label>
            <Input
              id={`student-first-name-${student.id}`}
              name="firstName"
              defaultValue={student.firstName}
              maxLength={100}
              autoComplete="given-name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`student-last-name-${student.id}`}>Soyad</Label>
            <Input
              id={`student-last-name-${student.id}`}
              name="lastName"
              defaultValue={student.lastName}
              maxLength={100}
              autoComplete="family-name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`student-phone-${student.id}`}>Telefon</Label>
            <Input
              id={`student-phone-${student.id}`}
              name="phone"
              defaultValue={student.phone ?? ""}
              inputMode="tel"
              autoComplete="tel"
              maxLength={50}
              placeholder="05xx xxx xx xx"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`student-birth-date-${student.id}`}>Doğum tarihi</Label>
            <Input
              id={`student-birth-date-${student.id}`}
              name="birthDate"
              type="date"
              defaultValue={student.birthDate?.toISOString().slice(0, 10) ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`student-district-${student.id}`}>İlçe</Label>
            <Input
              id={`student-district-${student.id}`}
              name="district"
              defaultValue={student.district ?? ""}
              maxLength={100}
              autoComplete="address-level2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`student-class-level-${student.id}`}>Sınıf seviyesi</Label>
            <Input
              id={`student-class-level-${student.id}`}
              name="classLevel"
              defaultValue={student.classLevel ?? ""}
              maxLength={100}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`student-address-${student.id}`}>Adres</Label>
            <Textarea
              id={`student-address-${student.id}`}
              name="address"
              defaultValue={student.address ?? ""}
              maxLength={500}
              autoComplete="street-address"
              rows={3}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full">
              Değişiklikleri kaydet
            </Button>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
