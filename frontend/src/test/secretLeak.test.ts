import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const FORBIDDEN = [
  "OPENAI_API_KEY",
  "MIDTRANS_SERVER_KEY",
  "MIDTRANS_CLIENT_KEY",
  "VITE_MIDTRANS_CLIENT_KEY",
  "DJANGO_SECRET_KEY",
  "POSTGRES_PASSWORD",
  "POSTGRES_USER",
  "POSTGRES_DB",
  "POSTGRES_HOST",
  "POSTGRES_PORT",
];

function walkSrc(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["test", "node_modules", "dist"].includes(entry.name)) continue;
      walkSrc(full, acc);
    } else if (/\.(ts|tsx|js|jsx|json|env|example)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("secret-leak protection", () => {
  const root = path.resolve(__dirname, "..", "..");
  const files = [
    ...walkSrc(path.join(root, "src")),
    path.join(root, ".env.example"),
  ];

  it("does not contain backend secrets in source", () => {
    for (const f of files) {
      const content = fs.readFileSync(f, "utf8");
      for (const secret of FORBIDDEN) {
        expect(content.includes(secret), `${f} must not contain ${secret}`).toBe(
          false,
        );
      }
    }
  });

  it(".env.example exposes only VITE_API_BASE_URL and no secrets", () => {
    const content = fs.readFileSync(path.join(root, ".env.example"), "utf8");
    expect(content.includes("VITE_API_BASE_URL")).toBe(true);
    for (const secret of FORBIDDEN) {
      expect(content.includes(secret)).toBe(false);
    }
  });
});
