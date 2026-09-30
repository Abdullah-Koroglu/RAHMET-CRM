import { Badge } from "@/components/ui/badge";
import { statusLabels } from "@/lib/format";
export function StatusBadge({ status }: { status: string }) { const variant = status === "ERROR" || status === "REJECTED" ? "destructive" : status === "ACTIVE" || status === "APPROVED" || status === "CONVERTED" ? "default" : "outline"; return <Badge variant={variant}>{statusLabels[status] ?? status}</Badge>; }
