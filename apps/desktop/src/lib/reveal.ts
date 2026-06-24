/**
 * The ancestor directory paths of a file path, outermost first. Used to auto-reveal
 * a file in the explorer by expanding the folders that contain it. Pure, so it is
 * unit tested.
 */
export function ancestorsOf(path: string): string[] {
  const parts = path.split('/').filter(Boolean);
  const out: string[] = [];
  for (let i = 1; i < parts.length; i += 1) {
    out.push(parts.slice(0, i).join('/'));
  }
  return out;
}
