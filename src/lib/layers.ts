/** Single source of truth for the layered stack: chrome < popovers < dialogs < toasts. */
export const Z_INDEX = {
  panel: 10,
  toolbar: 30,
  popover: 70,
  dialog: 90,
  toast: 120,
} as const;

export function applyLayerTokens(root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--z-panel', String(Z_INDEX.panel));
  root.style.setProperty('--z-toolbar', String(Z_INDEX.toolbar));
  root.style.setProperty('--z-popover', String(Z_INDEX.popover));
  root.style.setProperty('--z-dialog', String(Z_INDEX.dialog));
  root.style.setProperty('--z-toast', String(Z_INDEX.toast));
}
