export const statusLabels: Record<string, string> = {
  NEW: "Yeni",
  IN_REVIEW: "İnceleniyor",
  CONTACTED: "Ulaşıldı",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  CONVERTED: "Kesin kayda dönüştü",
  CANCELLED: "Kesin kayıt iptal edildi",
  ACTIVE: "Aktif",
  PAUSED: "Duraklatıldı",
  ERROR: "Hata",
  ARCHIVED: "Arşivlendi",
  PRESENT: "Katıldı",
  ABSENT: "Katılmadı",
};

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatMoney(value: { toString(): string } | number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}
