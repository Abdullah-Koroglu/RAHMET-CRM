"use client";

import { useActionState } from "react";
import { INITIAL_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({ action, children, className }: { action: Action; children: React.ReactNode; className?: string }) {
  const [state, formAction, pending] = useActionState(action, INITIAL_ACTION_STATE);
  return (
    <form action={formAction} className={className} aria-busy={pending}>
      <fieldset disabled={pending} className="contents">{children}</fieldset>
      <p className={cn("mt-2 text-sm", state.status === "error" ? "text-destructive" : "text-emerald-700")} aria-live="polite">
        {pending ? "İşlem sürüyor…" : state.message}
      </p>
    </form>
  );
}
