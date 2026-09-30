export type ActionState = { status: "idle" | "success" | "error"; message: string };
export const INITIAL_ACTION_STATE: ActionState = { status: "idle", message: "" };
export const actionError = (message = "İşlem tamamlanamadı. Bilgileri kontrol edip yeniden deneyin."): ActionState => ({ status: "error", message });
export const actionSuccess = (message: string): ActionState => ({ status: "success", message });
