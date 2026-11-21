import { Zap } from 'lucide-react';
import type { Integration } from '../lib/types';
import { brandColor, logoFor } from '../lib/brandLogos';

/**
 * The real brand mark when `simple-icons` ships one, otherwise the text
 * fallback the caller passes in. The glyph inherits `currentColor`, so the
 * surrounding tile decides its colour.
 */
export function BrandGlyph({
  id,
  fallback,
  size,
  fallbackColor,
}: {
  id: string;
  fallback?: string;
  size: number;
  fallbackColor?: string;
}) {
  const logo = logoFor(id);
  if (logo) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
        aria-hidden
        focusable="false"
      >
        <path d={logo.path} />
      </svg>
    );
  }
  if (fallback === undefined) return null;
  return (
    <span
      aria-hidden
      style={{
        fontWeight: 700,
        fontSize: size * 0.86,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        color: fallbackColor,
      }}
    >
      {fallback}
    </span>
  );
}

/** Square, white-background service tile used by the integrations screens. */
export function ServiceTile({ integration, size = 52 }: { integration: Integration; size?: number }) {
  return (
    <span
      className="grid place-items-center flex-none select-none"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.24),
        background: '#ffffff',
        color: brandColor(integration.id) ?? integration.color,
        fontFamily: 'inherit',
        boxShadow: '0 1px 2px rgba(0,0,0,.18)',
        border: '1px solid rgba(0,0,0,.06)',
      }}
    >
      <BrandGlyph
        id={integration.id}
        fallback={integration.monogram}
        fallbackColor={integration.color}
        size={Math.round(size * 0.58)}
      />
    </span>
  );
}

/** Provider row mark: brand tile when known, generic glyph otherwise. */
export function ProviderMark({ id, size = 36 }: { id: string; size?: number }) {
  const color = brandColor(id);
  return (
    <div
      className="grid place-items-center flex-none"
      style={
        color
          ? {
              width: size,
              height: size,
              borderRadius: Math.round(size * 0.28),
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,.06)',
              color,
            }
          : {
              width: size,
              height: size,
              borderRadius: Math.round(size * 0.28),
              background: 'var(--elevated)',
              border: '1px solid var(--line)',
            }
      }
    >
      {color ? (
        <BrandGlyph id={id} size={Math.round(size * 0.56)} />
      ) : (
        <Zap size={Math.round(size * 0.46)} aria-hidden />
      )}
    </div>
  );
}
