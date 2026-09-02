export async function sha256Text(value: string): Promise<string> {
  return sha256Bytes(new TextEncoder().encode(value));
}

export async function sha256Bytes(value: ArrayBuffer | ArrayBufferView): Promise<string> {
  const bytes = value instanceof ArrayBuffer
    ? value
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice().buffer;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
