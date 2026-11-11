export type Size = "S" | "M" | "L";
export type Assignee = "KJ" | "AB" | "Both";
export type ColumnId = "todo" | "doing" | "waiting" | "done";
export type Subtask = { id: string; text: string; done: boolean };
export type Attachment = { id: string; name: string; path?: string; url?: string };
export type CardT = {
  id: string; title: string; description: string; link: string; due?: string | undefined;
  size: Size; assignee: Assignee; column: ColumnId; subtasks: Subtask[]; attachments: Attachment[];
};

export const POINTS: Record<Size, number> = { S: 1, M: 3, L: 8 };

export function balance(cards: Pick<CardT, "size" | "assignee">[]) {
  let kj = 0, ab = 0;
  for (const c of cards) {
    const p = POINTS[c.size];
    if (c.assignee === "KJ") kj += p;
    else if (c.assignee === "AB") ab += p;
    else { kj += p / 2; ab += p / 2; }
  }
  const total = kj + ab;
  const kjPct = total ? Math.round((kj / total) * 100) : 50;
  const diff = Math.abs(kjPct - (100 - kjPct));
  const status = diff <= 15 ? "Balanced" : diff <= 35 ? "Slight imbalance" : "High disparity";
  return { kj, ab, kjPct, abPct: 100 - kjPct, status };
}
