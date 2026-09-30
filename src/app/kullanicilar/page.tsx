import { createAppUser, updateAppUser } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const roleItems = [{ value: "ADMIN", label: "Yönetici" }, { value: "OPERATOR", label: "Operatör" }, { value: "VIEWER", label: "Görüntüleyici" }] as const;

export default async function UsersPage() {
  await requireRole(["ADMIN"]);
  const users = await db.appUser.findMany({ orderBy: [{ isActive: "desc" }, { displayName: "asc" }] });
  return <div className="space-y-6"><PageHeader title="Kullanıcılar" description="Kişisel hesap, rol, erişim ve parola rotasyonu." /><div className="grid gap-6 xl:grid-cols-[1fr_380px]"><div className="space-y-4">{users.map((user) => <Card key={user.id}><CardHeader><CardTitle className="text-base">{user.displayName}</CardTitle><p className="text-sm text-muted-foreground">{user.email}</p></CardHeader><CardContent><ActionForm action={updateAppUser} className="grid gap-3 sm:grid-cols-3 sm:items-end"><input type="hidden" name="id" value={user.id} /><div className="space-y-2"><Label htmlFor={`role-${user.id}`}>Rol</Label><Select name="role" defaultValue={user.role}><SelectTrigger id={`role-${user.id}`}><SelectValue /></SelectTrigger><SelectContent>{roleItems.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor={`active-${user.id}`}>Erişim</Label><Select name="isActive" defaultValue={String(user.isActive)}><SelectTrigger id={`active-${user.id}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Aktif</SelectItem><SelectItem value="false">Pasif</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor={`password-${user.id}`}>Yeni parola</Label><Input id={`password-${user.id}`} name="password" type="password" autoComplete="new-password" minLength={14} maxLength={200} placeholder="Değişmeyecekse boş" /></div><Button type="submit" variant="outline" className="sm:col-span-3 sm:w-fit">Hesabı güncelle</Button></ActionForm></CardContent></Card>)}</div><Card className="h-fit"><CardHeader><CardTitle>Yeni kullanıcı</CardTitle></CardHeader><CardContent><ActionForm action={createAppUser} className="space-y-4"><div className="space-y-2"><Label htmlFor="new-displayName">Ad soyad</Label><Input id="new-displayName" name="displayName" maxLength={120} required /></div><div className="space-y-2"><Label htmlFor="new-email">E-posta</Label><Input id="new-email" name="email" type="email" maxLength={254} required /></div><div className="space-y-2"><Label htmlFor="new-role">Rol</Label><Select name="role" defaultValue="OPERATOR"><SelectTrigger id="new-role"><SelectValue /></SelectTrigger><SelectContent>{roleItems.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="new-password">Geçici parola</Label><Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={14} maxLength={200} required /></div><Button type="submit">Kullanıcı oluştur</Button></ActionForm></CardContent></Card></div></div>;
}
