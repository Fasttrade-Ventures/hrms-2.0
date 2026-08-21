import { vi } from "vitest";

export const headers = vi.fn(async () => {
  return {
    get: (key: string) => {
      if (key === "x-forwarded-for") return "127.0.0.1";
      return null;
    }
  };
});
