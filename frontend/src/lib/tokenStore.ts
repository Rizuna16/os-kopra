const REFRESH_KEY = "kopera_refresh_token";

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getRefreshToken(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setRefreshToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(REFRESH_KEY, token);
    } else {
      sessionStorage.removeItem(REFRESH_KEY);
    }
  } catch {
    /* private-storage unavailable: ignore */
  }
}

export function clearTokens(): void {
  accessToken = null;
  setRefreshToken(null);
}
