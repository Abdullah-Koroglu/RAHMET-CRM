import { redirect } from "next/navigation";
import { loginAction } from "@/app/auth-actions";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOptionalUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getOptionalUser()) redirect("/");
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>RAHMET CRM</CardTitle>
          <CardDescription>Kişisel hesabınızla yönetim paneline giriş yapın.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={loginAction} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="email">E-posta</Label><Input id="email" name="email" type="email" autoComplete="username" maxLength={254} required /></div>
            <div className="space-y-2"><Label htmlFor="password">Parola</Label><Input id="password" name="password" type="password" autoComplete="current-password" maxLength={200} required /></div>
            <Button type="submit" className="w-full">Giriş yap</Button>
          </ActionForm>
        </CardContent>
      </Card>
    </main>
  );
}
