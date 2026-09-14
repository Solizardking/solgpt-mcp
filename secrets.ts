const SECRET_FIELD =
  /(?:^|_)(?:private|secret|seed|mnemonic)(?:_|$)|privatekey|secretkey|secretKey|privateKey/i;

export function assertNoSecretFields(value: unknown, path = "input"): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_FIELD.test(key)) {
      throw new Error(
        `${path}.${key} is forbidden; provide public addresses only`,
      );
    }
    assertNoSecretFields(child, `${path}.${key}`);
  }
}

export function isSecretFieldName(key: string): boolean {
  return SECRET_FIELD.test(key);
}

export function requireString(input: Record<string, unknown>, key: string): string {
  const value = String(input[key] ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

export function requirePositiveIntegerString(
  input: Record<string, unknown>,
  key: string,
): string {
  const value = requireString(input, key);
  if (!/^\d+$/.test(value) || BigInt(value) <= 0n) {
    throw new Error(`${key} must be a positive integer in smallest units`);
  }
  return value;
}

export function requireNonNegativeIntegerString(
  input: Record<string, unknown>,
  key: string,
): string {
  const value = String(input[key] ?? "").trim();
  if (!/^\d+$/.test(value)) {
    throw new Error(`${key} must be a non-negative integer in smallest units`);
  }
  return value;
}
