import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { CalendarIcon, ExternalLink, Heart, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Our Home Board — KJ & AB" },
      { name: "description", content: "A shared kanban board for tasks, chores and reminders for KJ & AB." },
      { property: "og:title", content: "Our Home Board — KJ & AB" },
      { property: "og:description", content: "A shared kanban board for tasks, chores and reminders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Board,
});

type Size = "S" | "M" | "L";
type Assignee = "KJ" | "AB" | "Both";
type Category = "Task" | "Chore" | "Reminder" | "Errand";
type ColumnId = "todo" | "doing" | "waiting" | "done";
type CardT = {
  id: string; title: string; description: string; link: string; due?: string | undefined;
  size: Size; assignee: Assignee; category: Category; column: ColumnId;
};

const COLUMNS: { id: ColumnId; title: string; hint: string }[] = [
  { id: "todo", title: "To Do", hint: "On our list" },
  { id: "doing", title: "In Progress", hint: "Someone's on it" },
  { id: "waiting", title: "Waiting On", hint: "Blocked or scheduled" },
  { id: "done", title: "Done", hint: "High five" },
];
const CATEGORIES: Category[] = ["Task", "Chore", "Reminder", "Errand"];
const KEY = "marriage-kanban-v1";

const seed: CardT[] = [
  { id: "1", title: "Book anniversary dinner", description: "Somewhere new — check the waterfront spots.", link: "", size: "S", assignee: "KJ", category: "Reminder", column: "todo" },
  { id: "2", title: "Deep clean the kitchen", description: "Fridge, oven, under the sink.", link: "", size: "L", assignee: "Both", category: "Chore", column: "todo" },
  { id: "3", title: "Renew car registration", description: "", link: "", size: "M", assignee: "AB", category: "Errand", column: "doing" },
  { id: "4", title: "Pick up dry cleaning", description: "", link: "", size: "S", assignee: "KJ", category: "Errand", column: "done" },
];

const assigneeStyle: Record<Assignee, string> = {
  KJ: "bg-kj text-kj-foreground",
  AB: "bg-ab text-ab-foreground",
  Both: "bg-both text-both-foreground",
};

function Board() {
  const [cards, setCards] = useState<CardT[]>(seed);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<CardT | null>(null);
  const [filter, setFilter] = useState<Assignee | "All">("All");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<ColumnId | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) try { setCards(JSON.parse(raw)); } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(cards)); }, [cards, loaded]);

  const newCard = (column: ColumnId) =>
    setEditing({ id: "", title: "", description: "", link: "", size: "M", assignee: "Both", category: "Task", column });

  const save = (c: CardT) => {
    if (!c.title.trim()) return;
    setCards((cs) => c.id ? cs.map((x) => (x.id === c.id ? c : x)) : [...cs, { ...c, id: crypto.randomUUID() }]);
    setEditing(null);
  };
  const remove = (id: string) => { setCards((cs) => cs.filter((x) => x.id !== id)); setEditing(null); };
  const move = (id: string, column: ColumnId) => setCards((cs) => cs.map((x) => (x.id === id ? { ...x, column } : x)));

  const visible = cards.filter((c) => filter === "All" || c.assignee === filter || (filter !== "Both" && c.assignee === "Both"));

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 pb-6 pt-10">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary">
            <Heart className="h-4 w-4 fill-current" /> KJ & AB
          </p>
          <h1 className="font-display text-4xl font-semibold text-foreground md:text-5xl">Our Home Board</h1>
          <p className="mt-1 text-muted-foreground">Tasks, chores & reminders — together.</p>
        </div>
        <BalanceBar cards={cards} />
        <div className="flex items-center gap-1 rounded-full border bg-card p-1">
          {(["All", "KJ", "AB", "Both"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {f}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-4 gap-5 overflow-x-auto px-6 pb-16 min-w-[1000px]">
        {COLUMNS.map((col) => {
          const list = visible.filter((c) => c.column === col.id);
          return (
            <section key={col.id}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
              onDragLeave={() => setOverCol(null)}
              onDrop={() => { if (dragId) move(dragId, col.id); setDragId(null); setOverCol(null); }}
              className={cn("flex min-h-[300px] flex-col rounded-2xl bg-column p-4 transition-shadow",
                overCol === col.id && "ring-2 ring-primary")}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold">{col.title} <span className="ml-1 text-sm text-muted-foreground">{list.length}</span></h2>
                  <p className="text-xs text-muted-foreground">{col.hint}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => newCard(col.id)} aria-label={`Add to ${col.title}`}><Plus /></Button>
              </div>
              <div className="flex flex-1 flex-col gap-3">
                {list.map((c) => {
                  const overdue = c.due && c.column !== "done" && isBefore(new Date(c.due), startOfDay(new Date()));
                  return (
                    <article key={c.id} draggable
                      onDragStart={() => setDragId(c.id)}
                      onClick={() => setEditing(c)}
                      className={cn("cursor-pointer rounded-xl border bg-card p-3 shadow-soft transition hover:-translate-y-0.5",
                        c.column === "done" && "opacity-60", dragId === c.id && "opacity-40")}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c.category}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", assigneeStyle[c.assignee])}>{c.assignee}</span>
                      </div>
                      <h3 className={cn("font-semibold leading-snug", c.column === "done" && "line-through")}>{c.title}</h3>
                      {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <span className="rounded-md bg-secondary px-1.5 py-0.5 font-bold text-secondary-foreground">{c.size}</span>
                        <DuePicker value={c.due} overdue={!!overdue}
                          onChange={(v) => setCards((cs) => cs.map((x) => (x.id === c.id ? { ...x, due: v } : x)))} />
                        {c.link && (
                          <a href={c.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                            className="ml-auto flex items-center gap-1 text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" /> Link
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
                <button onClick={() => newCard(col.id)}
                  className="rounded-xl border border-dashed py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary">
                  + Add card
                </button>
              </div>
            </section>
          );
        })}
      </main>

      <CardDialog card={editing} onClose={() => setEditing(null)} onSave={save} onDelete={remove} />
    </div>
  );
}

const POINTS: Record<Size, number> = { S: 1, M: 3, L: 8 };

export function balance(cards: CardT[]) {
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

function BalanceBar({ cards }: { cards: CardT[] }) {
  const b = balance(cards);
  const tone = b.status === "Balanced" ? "text-success" : b.status === "Slight imbalance" ? "text-warning" : "text-primary";
  const fmt = (n: number) => (Number.isInteger(n) ? n : n.toFixed(1));
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card px-4 py-2.5 text-xs">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-kj text-[11px] font-bold text-kj-foreground">KJ</span>
        <div><div className="text-muted-foreground">KJ</div><div className="font-bold">{fmt(b.kj)} pts ({b.kjPct}%)</div></div>
      </div>
      <div className="flex w-40 flex-col gap-1">
        <div className="flex justify-between text-[11px] text-muted-foreground"><span>Target 50/50</span><span className={cn("font-semibold", tone)}>{b.status}</span></div>
        <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-kj transition-all" style={{ width: `${b.kjPct}%` }} />
          <div className="h-full bg-ab transition-all" style={{ width: `${b.abPct}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2 text-right">
        <div><div className="text-muted-foreground">AB</div><div className="font-bold">{fmt(b.ab)} pts ({b.abPct}%)</div></div>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ab text-[11px] font-bold text-ab-foreground">AB</span>
      </div>
    </div>
  );
}

function DuePicker({ value, overdue, onChange }: { value?: string | undefined; overdue: boolean; onChange: (v?: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" onClick={(e) => e.stopPropagation()} draggable={false}
          className={cn("flex items-center gap-1 rounded-md border px-1.5 py-0.5 hover:border-primary",
            overdue ? "font-semibold text-destructive" : value ? "text-foreground" : "border-dashed text-muted-foreground")}>
          <CalendarIcon className="h-3 w-3" />{value ? format(new Date(value), "MMM d") : "Due date"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
        <Calendar mode="single" selected={value ? new Date(value) : undefined}
          onSelect={(dt) => onChange(dt ? dt.toISOString() : undefined)} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}

function Seg<T extends string>({ value, options, onChange, styleFor }: { value: T; options: readonly T[]; onChange: (v: T) => void; styleFor?: (v: T) => string }) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={cn("flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition",
            value === o ? (styleFor?.(o) ?? "bg-primary text-primary-foreground") + " border-transparent" : "bg-card text-muted-foreground hover:text-foreground")}>
          {o}
        </button>
      ))}
    </div>
  );
}

function CardDialog({ card, onClose, onSave, onDelete }: { card: CardT | null; onClose: () => void; onSave: (c: CardT) => void; onDelete: (id: string) => void }) {
  const [d, setD] = useState<CardT | null>(card);
  useEffect(() => setD(card), [card]);
  if (!d) return null;
  const set = <K extends keyof CardT>(k: K, v: CardT[K]) => setD({ ...d, [k]: v });
  return (
    <Dialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-display text-2xl">{d.id ? "Edit card" : "New card"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5"><Label>Title</Label><Input autoFocus value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="What needs doing?" /></div>
          <div className="grid gap-1.5"><Label>Category</Label><Seg value={d.category} options={CATEGORIES} onChange={(v) => set("category", v)} /></div>
          <div className="grid gap-1.5"><Label>Assignee</Label><Seg value={d.assignee} options={["KJ", "AB", "Both"] as const} onChange={(v) => set("assignee", v)} styleFor={(v) => assigneeStyle[v]} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5"><Label>Size (effort)</Label><Seg value={d.size} options={["S", "M", "L"] as const} onChange={(v) => set("size", v)} /></div>
            <div className="grid gap-1.5"><Label>Due date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start font-normal", !d.due && "text-muted-foreground")}>
                    <CalendarIcon />{d.due ? format(new Date(d.due), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={d.due ? new Date(d.due) : undefined}
                    onSelect={(dt) => set("due", dt ? dt.toISOString() : undefined)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid gap-1.5"><Label>Description</Label><Textarea rows={3} value={d.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Link</Label><Input type="url" value={d.link} onChange={(e) => set("link", e.target.value)} placeholder="https://" /></div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {d.id ? <Button variant="ghost" className="text-destructive" onClick={() => onDelete(d.id)}><Trash2 /> Delete</Button> : <span />}
          <Button onClick={() => onSave(d)} disabled={!d.title.trim()}>Save card</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
