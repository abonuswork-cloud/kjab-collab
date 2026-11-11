import { describe, it, expect } from "vitest";
import { balance } from "@/lib/board";
const c = (size: "S" | "M" | "L", assignee: "KJ" | "AB" | "Both") => ({ id: "x", title: "t", description: "", link: "", size, assignee, column: "todo" as const });
describe("balance bar", () => {
  it("S = 1 pt", () => { expect(balance([c("S", "KJ")]).kj).toBe(1); });
  it("M = 3 pts", () => { expect(balance([c("M", "KJ")]).kj).toBe(3); });
  it("L = 8 pts", () => { expect(balance([c("L", "AB")]).ab).toBe(8); });
  it("splits Both cards evenly", () => { expect(balance([c("L", "Both")])).toMatchObject({ kj: 4, ab: 4, status: "Balanced" }); });
});
