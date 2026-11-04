"use client";

import { useMemo, useState } from "react";
import { deactivateStudentEnrollments } from "@/app/actions";
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

type Enrollment = {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  course: { name: string };
};

export function StudentEnrollmentStatusDialog({
  studentId,
  studentName,
  enrollments,
}: {
  studentId: string;
  studentName: string;
  enrollments: Enrollment[];
}) {
  const activeEnrollments = useMemo(
    () => enrollments.filter((enrollment) => enrollment.status === "ACTIVE"),
    [enrollments],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!activeEnrollments.length) return null;

  const selectAll = () => setSelectedIds(activeEnrollments.map((enrollment) => enrollment.id));
  const toggle = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Pasife al
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ders kayıtlarını pasife al</DialogTitle>
          <DialogDescription>
            {studentName} için pasife alınacak dersleri seçin. Tahsilat, ödeme ve yoklama geçmişi silinmez.
          </DialogDescription>
        </DialogHeader>
        <ActionForm action={deactivateStudentEnrollments} className="space-y-4">
          <input type="hidden" name="studentId" value={studentId} />
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">Aktif dersler</p>
            <Button type="button" size="sm" variant="outline" onClick={selectAll}>
              Tümünü seç
            </Button>
          </div>
          <div className="space-y-2">
            {activeEnrollments.map((enrollment) => (
              <label key={enrollment.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm">
                <input
                  type="checkbox"
                  name="enrollmentIds"
                  value={enrollment.id}
                  checked={selectedIds.includes(enrollment.id)}
                  onChange={() => toggle(enrollment.id)}
                />
                <span>{enrollment.course.name}</span>
              </label>
            ))}
          </div>
          {selectedIds.length === activeEnrollments.length ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Tüm aktif dersler seçili. Öğrenci aktif ders listelerinden çıkar; profil ve geçmişi korunur.
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor={`enrollment-deactivation-reason-${studentId}`}>Pasife alma nedeni</Label>
            <Textarea
              id={`enrollment-deactivation-reason-${studentId}`}
              name="reason"
              maxLength={1000}
              placeholder="Örn. Öğrenci devam etmeyecek"
              required
            />
          </div>
          <Button type="submit" variant="destructive" className="w-full" disabled={!selectedIds.length}>
            {selectedIds.length === activeEnrollments.length ? "Tüm dersleri pasife al" : "Seçili dersleri pasife al"}
          </Button>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
