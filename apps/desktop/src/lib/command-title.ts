/**
 * Splits a command title like "Git: View History" into its category ("Git") and
 * label ("View History") so the command palette can show the category as a badge.
 * Titles without a "Category: " prefix have no category. Pure, so it is unit tested.
 */
export interface CommandTitleParts {
  category?: string;
  label: string;
}

export function splitCommandTitle(title: string): CommandTitleParts {
  const separator = title.indexOf(': ');
  if (separator > 0) {
    return { category: title.slice(0, separator), label: title.slice(separator + 2) };
  }
  return { label: title };
}
