import { vi } from "vitest";

export const redirect = vi.fn((url: string) => {
  throw new Error("NEXT_REDIRECT");
});
