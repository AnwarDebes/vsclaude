import { useEffect, useRef, useState } from 'react';
import { MENU_BAR } from '../lib/menus';

export interface MenuBarProps {
  /** Run a command by id (the menu items reference the command registry). */
  onRun: (command: string) => void;
}

/**
 * A classic menu bar (File, View, Go, Help). Each menu opens a dropdown of commands;
 * choosing one runs it through the registry. Clicking away or pressing Escape closes.
 */
export function MenuBar({ onRun }: MenuBarProps) {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="menubar" ref={ref}>
      {MENU_BAR.map((menu) => (
        <div className="menubar__menu" key={menu.label}>
          <button
            type="button"
            className="menubar__button"
            aria-haspopup="menu"
            aria-expanded={open === menu.label}
            onClick={() => setOpen((cur) => (cur === menu.label ? null : menu.label))}
          >
            {menu.label}
          </button>
          {open === menu.label ? (
            <div className="menubar__dropdown" role="menu" aria-label={menu.label}>
              {menu.items.map((item) => (
                <button
                  type="button"
                  key={item.command}
                  className="menubar__item"
                  role="menuitem"
                  onClick={() => {
                    setOpen(null);
                    onRun(item.command);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
