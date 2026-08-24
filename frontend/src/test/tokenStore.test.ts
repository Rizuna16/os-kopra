import { describe, it, expect, beforeEach } from "vitest";
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
} from "../lib/tokenStore";

describe("tokenStore", () => {
  beforeEach(() => {
    clearTokens();
    sessionStorage.clear();
  });

  it("stores access token in memory only", () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken("access-1");
    expect(getAccessToken()).toBe("access-1");
    // not persisted to sessionStorage
    expect(sessionStorage.getItem("kopera_refresh_token")).toBeNull();
  });

  it("persists refresh token in sessionStorage", () => {
    expect(getRefreshToken()).toBeNull();
    setRefreshToken("refresh-1");
    expect(getRefreshToken()).toBe("refresh-1");
    expect(sessionStorage.getItem("kopera_refresh_token")).toBe("refresh-1");
  });

  it("clearTokens removes both access and refresh", () => {
    setAccessToken("access-1");
    setRefreshToken("refresh-1");
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("tolerates missing sessionStorage (SSR / privacy mode)", () => {
    const original = window.sessionStorage;
    Object.defineProperty(window, "sessionStorage", {
      value: undefined,
      configurable: true,
    });
    expect(() => setRefreshToken("r")).not.toThrow();
    expect(() => getRefreshToken()).not.toThrow();
    Object.defineProperty(window, "sessionStorage", {
      value: original,
      configurable: true,
    });
  });
});
