export function compareVersions(lhs: string, rhs: string): number {
  const left = parseVersion(lhs);
  const right = parseVersion(rhs);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

export function isVersionAtLeast(current: string, minimum: string | null): boolean {
  return minimum === null || compareVersions(current, minimum) >= 0;
}

function parseVersion(value: string): number[] {
  const core = value.trim().split("-", 1)[0] ?? "";
  if (!/^\d+(?:\.\d+)*$/.test(core)) {
    return [0];
  }
  return core.split(".").map((component) => Number(component));
}
