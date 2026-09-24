import { reactive, markRaw, type Component } from 'vue';

interface Toast { id: number; msg: string; err: boolean }

export const ui = reactive({
  modal: null as null | { component: Component; props: Record<string, unknown> },
  toasts: [] as Toast[],
});

export function openModal(component: Component, props: Record<string, unknown> = {}) {
  ui.modal = { component: markRaw(component), props };
}
export function closeModal() {
  ui.modal = null;
}

let seq = 0;
export function toast(msg: string, err = false) {
  const id = ++seq;
  ui.toasts.push({ id, msg, err });
  setTimeout(() => {
    const i = ui.toasts.findIndex(t => t.id === id);
    if (i >= 0) ui.toasts.splice(i, 1);
  }, err ? 5000 : 3200);
}

/** Run a write, toast the outcome, return whether it worked. */
export async function attempt(fn: () => Promise<unknown>, ok?: string): Promise<boolean> {
  try {
    await fn();
    if (ok) toast(ok);
    return true;
  } catch (e) {
    toast(e instanceof Error ? e.message : String(e), true);
    return false;
  }
}
