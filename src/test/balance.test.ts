import { describe, it, expect } from "vitest";
import { balance } from "@/routes/index";
const c = (size: "S" | "M" | "L", assignee: "KJ" | "AB" | "Both") => ({ id: "x", title: "t", description: "", link: "", size, assignee, category: "Task" as const, column: "todo" as const });
describe("balance bar", () => {
  it("scores S=1 M=2 L=3", () => { expect(balance([c("L", "KJ"), c("S", "AB")])).toMatchObject({ kj: 3, ab: 1, kjPct: 75 }); });
  it("splits Both cards evenly", () => { expect(balance([c("M", "Both")])).toMatchObject({ kj: 1, ab: 1, status: "Balanced" }); });
});
