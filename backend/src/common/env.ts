const PLACEHOLDER_PATTERNS = [
  /^your-/i,
  /^change-/i,
  /^example/i,
  /^placeholder/i,
  /^dummy/i,
];

export function isConfiguredValue(value?: string | null): value is string {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function isConfiguredSet(...values: Array<string | null | undefined>): boolean {
  return values.every(isConfiguredValue);
}
