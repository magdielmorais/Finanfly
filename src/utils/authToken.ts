// In-memory session token store (never persisted to localStorage or sessionStorage)
let inMemoryAuthToken: string | null = null;

export function setAuthToken(token: string | null | undefined): void {
  inMemoryAuthToken = token && typeof token === 'string' && token.trim() ? token.trim() : null;
}

export function getAuthToken(): string | null {
  return inMemoryAuthToken;
}

export function clearAuthToken(): void {
  inMemoryAuthToken = null;
}

export function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  if (inMemoryAuthToken) {
    headers['Authorization'] = `Bearer ${inMemoryAuthToken}`;
    headers['x-auth-token'] = inMemoryAuthToken;
  }
  return headers;
}
