const isoFractionPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+Z$/;

export function stripISO8601Milliseconds(value: string): string {
  return value.replace(isoFractionPattern, "$1Z");
}
