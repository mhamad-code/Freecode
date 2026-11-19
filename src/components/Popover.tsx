import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

type Side = 'top' | 'bottom' | 'auto';

export interface PopoverProps {
  trigger?: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  anchorRef?: RefObject<HTMLElement | null>;
  /** Preferred side. `auto` flips when there is not enough room. */
  side?: Side;
  align?: 'start' | 'end';
  width?: number;
  maxWidth?: number;
  /** Stays fixed while the body scrolls (e.g. a search field). */
  header?: ReactNode;
  className?: string;
  panelClassName?: string;
  role?: string;
  label?: string;
  /** Under 640px the panel becomes a bottom sheet. */
  mobileSheet?: boolean;
  /** Close after any button inside the panel is pressed. */
  closeOnSelect?: boolean;
}

interface Layout {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
}

const GAP = 6;
const PADDING = 12;
const MOBILE = 640;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function Popover({
  trigger,
  children,
  open: openProp,
  onOpenChange,
  anchorRef,
  side = 'auto',
  align = 'start',
  width = 280,
  maxWidth,
  header,
  className,
  panelClassName,
  role = 'menu',
  label,
  mobileSheet = true,
  closeOnSelect = false,
}: PopoverProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < MOBILE);
  const [sheetOffset, setSheetOffset] = useState(0);
  const [dragY, setDragY] = useState(0);
  const drag = useRef<{ y: number; active: boolean }>({ y: 0, active: false });
  const dragDelta = useRef(0);

  const setOpen = useCallback(
    (value: boolean) => {
      if (openProp === undefined) setOpenState(value);
      onOpenChange?.(value);
    },
    [onOpenChange, openProp],
  );

  /* reposition on open, scroll and resize */
  useLayoutEffect(() => {
    if (!open) {
      setLayout(null);
      return;
    }
    const measure = () => {
      const anchor = anchorRef?.current ?? triggerRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mobile = vw < MOBILE;
      setIsMobile(mobile);
      if (mobile && mobileSheet) {
        const vv = window.visualViewport;
        const offset = vv ? Math.max(0, vh - vv.height - vv.offsetTop) : 0;
        setSheetOffset(offset);
        return;
      }
      const wanted = Math.min(maxWidth ?? width, vw - PADDING * 2);
      const below = vh - rect.bottom - GAP - PADDING;
      const above = rect.top - GAP - PADDING;
      const preferTop = side === 'top' || (side === 'auto' && below < 240 && above > below);
      const space = preferTop ? above : below;
      setLayout({
        top: preferTop ? undefined : rect.bottom + GAP,
        bottom: preferTop ? vh - rect.top + GAP : undefined,
        left: align === 'start' ? clamp(rect.left, PADDING, vw - PADDING - wanted) : clamp(rect.right - wanted, PADDING, vw - PADDING - wanted),
        width: wanted,
        maxHeight: Math.max(160, Math.min(vh * 0.6, space)),
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      window.visualViewport?.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('scroll', measure);
    };
  }, [open, anchorRef, align, maxWidth, mobileSheet, side, width]);

  /* outside click + escape */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchorRef, open, setOpen]);

  /* keep the page still behind a mobile sheet */
  useEffect(() => {
    if (!open || !(isMobile && mobileSheet)) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, isMobile, mobileSheet]);

  const sheet = isMobile && mobileSheet;
  const panel = (
    <div
      ref={panelRef}
      role={role}
      aria-label={label}
      className={clsx('popover-surface z-popover flex flex-col overflow-hidden animate-popIn', panelClassName)}
      onClick={(e) => {
        if (closeOnSelect && (e.target as Element).closest('button')) setOpen(false);
      }}
      style={
        sheet
          ? {
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: sheetOffset,
              maxHeight: 'min(80dvh, calc(100dvh - 24px))',
              borderRadius: '18px 18px 0 0',
              paddingBottom: 'env(safe-area-inset-bottom)',
              transform: dragY ? `translateY(${dragY}px)` : undefined,
              transition: dragY ? 'none' : 'transform .18s var(--ease-out)',
            }
          : layout
            ? {
                position: 'fixed',
                top: layout.top,
                bottom: layout.bottom,
                left: layout.left,
                width: layout.width,
                maxHeight: layout.maxHeight,
                borderRadius: 14,
              }
            : { position: 'fixed', top: -9999, left: -9999, visibility: 'hidden' }
      }
    >
      {sheet ? (
        <div
          className="flex-none pt-2 pb-1 grid place-items-center cursor-grab touch-none"
          onPointerDown={(e) => {
            drag.current = { y: e.clientY, active: true };
            (e.target as Element).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current.active) return;
            dragDelta.current = Math.max(0, e.clientY - drag.current.y);
            setDragY(dragDelta.current);
          }}
          onPointerUp={() => {
            const shouldClose = dragDelta.current > 90;
            drag.current.active = false;
            dragDelta.current = 0;
            setDragY(0);
            if (shouldClose) setOpen(false);
          }}
          onPointerCancel={() => {
            drag.current.active = false;
            dragDelta.current = 0;
            setDragY(0);
          }}
        >
          <span className="h-1 w-9 rounded-full" style={{ background: 'var(--line-strong)' }} />
        </div>
      ) : null}
      {header ? <div className="flex-none">{header}</div> : null}
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </div>
  );

  return (
    <>
      {trigger ? (
        <div ref={triggerRef} className={clsx('relative', className)} onClick={() => setOpen(!open)}>
          {trigger}
        </div>
      ) : null}
      {open ? createPortal(
        <>
          {sheet ? (
            <div
              className="fixed inset-0"
              style={{ zIndex: 'var(--z-popover)', background: 'var(--scrim)' }}
              onClick={() => setOpen(false)}
              aria-hidden
            />
          ) : null}
          {panel}
        </>,
        document.body,
      ) : null}
    </>
  );
}
