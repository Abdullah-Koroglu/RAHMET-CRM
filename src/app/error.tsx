"use client";

import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(JSON.stringify({ event: "ui_render_error", digest: error.digest ?? "unknown" })); }, [error.digest]);
  return <Alert variant="destructive"><AlertTitle>Sayfa yüklenemedi</AlertTitle><AlertDescription className="space-y-3"><p>Kişisel veri içermeyen takip kodu: {error.digest ?? "oluşturulamadı"}</p><Button type="button" variant="outline" onClick={() => reset()}>Yeniden dene</Button></AlertDescription></Alert>;
}
