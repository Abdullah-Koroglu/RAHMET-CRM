import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="space-y-6" aria-busy="true" aria-label="Sayfa yükleniyor"><Skeleton className="h-9 w-64" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Card key={index}><CardContent className="space-y-3 pt-6"><Skeleton className="h-4 w-28" /><Skeleton className="h-9 w-20" /></CardContent></Card>)}</div><Skeleton className="h-72 w-full" /></div>;
}
