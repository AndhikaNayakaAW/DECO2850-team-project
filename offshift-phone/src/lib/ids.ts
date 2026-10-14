let counter = 0;

/** Short unique ids for messages, shifts and log entries. */
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
