import type { ReactNode } from 'react';
import { fileIconSpec, type FileIconKind } from '../lib/file-icons';

const SHAPES: Record<FileIconKind, ReactNode> = {
  folder: (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false">
      <path d="M1.5 4h4l1.3 1.5H14.5v8H1.5z" fill="currentColor" opacity="0.85" />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false">
      <path d="M4 2h5l3 3v9H4z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M9 2v3h3" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false">
      <rect x="2" y="3" width="12" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6" cy="6.5" r="1.2" fill="currentColor" />
      <path d="M3 12l3-3 2 2 3-3 3 3" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
};

/** A small file-type icon tinted by the file's category. Decorative. */
export function FileIcon({ name, isDirectory }: { name: string; isDirectory: boolean }) {
  const spec = fileIconSpec(name, isDirectory);
  return (
    <span className="file-icon" style={{ color: spec.color }} aria-hidden>
      {SHAPES[spec.kind]}
    </span>
  );
}
