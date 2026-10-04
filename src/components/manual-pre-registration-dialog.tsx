"use client";

import { createManualPreRegistration } from "@/app/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ManualPreRegistrationDialog({
  courses,
}: {
  courses: { id: string; name: string }[];
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>Ön kayıt ekle</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ön kayıt ekle</DialogTitle>
          <DialogDescription>
            Formdan gelmeyen başvuruyu ekleyin. Kayıt önce “Yeni” durumunda
            oluşturulur.
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          action={createManualPreRegistration}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="manual-full-name">Ad soyad</Label>
            <Input
              id="manual-full-name"
              name="fullName"
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-phone">Telefon</Label>
            <Input
              id="manual-phone"
              name="phoneRaw"
              inputMode="tel"
              maxLength={50}
              placeholder="05xx xxx xx xx"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-course">Ders</Label>
            <Select name="courseId">
              <SelectTrigger id="manual-course" className="w-full">
                <SelectValue placeholder="Ders seçin" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-birth-date">Doğum tarihi</Label>
            <Input id="manual-birth-date" name="birthDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-district">İlçe</Label>
            <Input id="manual-district" name="district" maxLength={100} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Ön kayıt oluştur
            </Button>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
