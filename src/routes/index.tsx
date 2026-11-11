import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { CalendarIcon, ExternalLink, Heart, LogOut, Paperclip, Plus, Trash2, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { balance, type Assignee, type Attachment, type CardT, type ColumnId } from "@/lib/board";

export const Route = createFileRoute("/")({
  ssr: false,
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
  component: Gate,
});

const COLUMNS: { id: ColumnId; title: string; hint: string }[] = [
  { id: "todo", title: "To Do", hint: "On our list" },
  { id: "doing", title: "In Progress", hint: "Someone's on it" },
  { id: "waiting", title: "Waiting On", hint: "Blocked or scheduled" },
  { id: "done", title: "Done", hint: "High five" },
];

const assigneeStyle: Record<Assignee, string> = {
  KJ: "bg-kj text-kj-foreground",
  AB: "bg-ab text-ab-foreground",
  Both: "bg-both text-both-foreground",
};

type Row = {
  id: string; title: string; description: string; link: string; due: string | null; size: string;
  assignee: string; column_id: string; subtasks: unknown; attachments: unknown;
};
const fromRow = (r: Row): CardT => ({
  id: r.id, title: r.title, description: r.description, link: r.link, due: r.due ?? undefined,
  size: r.size as CardT["size"], assignee: r.assignee as Assignee, column: r.column_id as ColumnId,
  subtasks: (r.subtasks as CardT["subtasks"]) ?? [], attachments: (r.attachments as Attachment[]) ?? [],
});
const toRow = (c: CardT) => ({
  id: c.id, title: c.title, description: c.description, link: c.link, due: c.due ?? null, size: c.size,
  assignee: c.assignee, column_id: c.column, subtasks: c.subtasks, attachments: c.attachments,
});

function Gate() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [member, setMember] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setMember(null); return; }
    supabase.rpc("is_board_member", { _uid: session.user.id }).then(({ data }) => setMember(!!data));
  }, [session]);

  if (session === undefined || (session && member === null)) return <div className="min-h-screen bg-background" />;
  if (!session) return <SignIn />;
  if (!member) return <SignIn denied email={session.user.email ?? ""} />;
  return <Board />;
}

function SignIn({ denied, email }: { denied?: boolean; email?: string }) {
  const [err, setErr] = useState("");
  const go = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setErr(r.error.message);
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-soft">
        <p className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary">
          <Heart className="h-4 w-4 fill-current" /> KJ & AB
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Our Home Board</h1>
        {denied ? (
          <>
            <p className="mt-4 text-sm text-muted-foreground">{email} doesn't have access to this board.</p>
            <Button variant="outline" className="mt-6 w-full" onClick={() => supabase.auth.signOut()}>Use another account</Button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to see your shared board.</p>
            <button onClick={go}
              className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-md border border-[#8E918F] bg-[#131314] px-3 py-2.5 text-sm font-medium text-[#E3E3E3]">
              <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
              Sign in with Google
            </button>
            {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function Board() {
  const [cards, setCards] = useState<CardT[]>([]);
  const [editing, setEditing] = useState<CardT | null>(null);
  const [filter, setFilter] = useState<Assignee | "All">("All");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<ColumnId | null>(null);

  const load = async () => {
    const { data } = await supabase.from("cards").select("*").order("created_at");
    if (data) setCards((data as Row[]).map(fromRow));
  };
  useEffect(() => {
    load();
    const ch = supabase.channel(`cards-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cards" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const upsert = async (c: CardT) => {
    setCards((cs) => (cs.some((x) => x.id === c.id) ? cs.map((x) => (x.id === c.id ? c : x)) : [...cs, c]));
    await supabase.from("cards").upsert(toRow(c));
  };
  const patch = (id: string, p: Partial<CardT>) => {
    const c = cards.find((x) => x.id === id);
    if (c) upsert({ ...c, ...p });
  };
  const remove = async (c: CardT) => {
    setCards((cs) => cs.filter((x) => x.id !== c.id));
    setEditing(null);
    const paths = c.attachments.flatMap((a) => (a.path ? [a.path] : []));
    if (paths.length) await supabase.storage.from("attachments").remove(paths);
    await supabase.from("cards").delete().eq("id", c.id);
  };
  const newCard = (column: ColumnId) =>
    setEditing({ id: "", title: "", description: "", link: "", size: "M", assignee: "Both", column, subtasks: [], attachments: [] });

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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border bg-card p-1">
            {(["All", "KJ", "AB", "Both"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {f}
              </button>
            ))}
          </div>
          <Button size="icon" variant="ghost" aria-label="Sign out" onClick={() => supabase.auth.signOut()}><LogOut /></Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl min-w-[1000px] grid-cols-4 gap-5 px-6 pb-16">
        {COLUMNS.map((col) => {
          const list = visible.filter((c) => c.column === col.id);
          return (
            <section key={col.id}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
              onDragLeave={() => setOverCol(null)}
              onDrop={() => { if (dragId) patch(dragId, { column: col.id }); setDragId(null); setOverCol(null); }}
              className={cn("flex min-h-[300px] flex-col rounded-2xl bg-column p-4 transition-shadow", overCol === col.id && "ring-2 ring-primary")}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold">{col.title} <span className="ml-1 text-sm text-muted-foreground">{list.length}</span></h2>
                  <p className="text-xs text-muted-foreground">{col.hint}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => newCard(col.id)} aria-label={`Add to ${col.title}`}><Plus /></Button>
              </div>
              <div className="flex flex-1 flex-col gap-3">
                {list.map((c) => {
                  const overdue = !!c.due && c.column !== "done" && isBefore(new Date(c.due), startOfDay(new Date()));
                  const doneSubs = c.subtasks.filter((s) => s.done).length;
                  return (
                    <article key={c.id} draggable onDragStart={() => setDragId(c.id)} onClick={() => setEditing(c)}
                      className={cn("cursor-pointer rounded-xl border bg-card p-3 shadow-soft transition hover:-translate-y-0.5",
                        c.column === "done" && "opacity-60", dragId === c.id && "opacity-40")}>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={cn("font-semibold leading-snug", c.column === "done" && "line-through")}>{c.title}</h3>
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", assigneeStyle[c.assignee])}>{c.assignee}</span>
                      </div>
                      {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-md bg-secondary px-1.5 py-0.5 font-bold text-secondary-foreground">{c.size}</span>
                        <DuePicker value={c.due} overdue={overdue} onChange={(v) => patch(c.id, { due: v })} />
                        {c.subtasks.length > 0 && <span className="text-muted-foreground">☑ {doneSubs}/{c.subtasks.length}</span>}
                        {c.attachments.length > 0 && <span className="flex items-center gap-0.5 text-muted-foreground"><Paperclip className="h-3 w-3" />{c.attachments.length}</span>}
                        {c.link && (
                          <a href={c.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                            className="ml-auto flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3 w-3" /> Link</a>
                        )}
                      </div>
                    </article>
                  );
                })}
                <button onClick={() => newCard(col.id)}
                  className="rounded-xl border border-dashed py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary">+ Add card</button>
              </div>
            </section>
          );
        })}
      </main>

      <CardDialog card={editing} onClose={() => setEditing(null)}
        onSave={(c) => { upsert(c); setEditing(null); }} onDelete={remove} />
    </div>
  );
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
        <button type="button" onClick={(e) => e.stopPropagation()}
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

function CardDialog({ card, onClose, onSave, onDelete }: { card: CardT | null; onClose: () => void; onSave: (c: CardT) => void; onDelete: (c: CardT) => void }) {
  const [d, setD] = useState<CardT | null>(card);
  const [isNew, setIsNew] = useState(false);
  const [sub, setSub] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setIsNew(!!card && !card.id);
    setD(card && !card.id ? { ...card, id: crypto.randomUUID() } : card);
    setSub(""); setDriveUrl("");
  }, [card]);
  if (!d) return null;
  const set = <K extends keyof CardT>(k: K, v: CardT[K]) => setD({ ...d, [k]: v });

  const addSub = () => { if (!sub.trim()) return; set("subtasks", [...d.subtasks, { id: crypto.randomUUID(), text: sub.trim(), done: false }]); setSub(""); };
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const added: Attachment[] = [];
    for (const f of Array.from(files)) {
      const path = `${d.id}/${crypto.randomUUID()}-${f.name}`;
      const { error } = await supabase.storage.from("attachments").upload(path, f);
      if (!error) added.push({ id: crypto.randomUUID(), name: f.name, path });
    }
    setD((cur) => (cur ? { ...cur, attachments: [...cur.attachments, ...added] } : cur));
    setUploading(false);
  };
  const addDrive = () => {
    const u = driveUrl.trim(); if (!/^https?:\/\//.test(u)) return;
    set("attachments", [...d.attachments, { id: crypto.randomUUID(), name: u.includes("google.com") ? "Google Drive file" : u, url: u }]);
    setDriveUrl("");
  };
  const openAtt = async (a: Attachment) => {
    if (a.url) { window.open(a.url, "_blank", "noopener"); return; }
    if (!a.path) return;
    const { data } = await supabase.storage.from("attachments").createSignedUrl(a.path, 600);
    if (data) window.open(data.signedUrl, "_blank", "noopener");
  };
  const removeAtt = async (a: Attachment) => {
    if (a.path) await supabase.storage.from("attachments").remove([a.path]);
    set("attachments", d.attachments.filter((x) => x.id !== a.id));
  };

  return (
    <Dialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">{isNew ? "New card" : "Edit card"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5"><Label>Title</Label><Input autoFocus value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="What needs doing?" /></div>
          <div className="grid gap-1.5"><Label>Assignee</Label><Seg value={d.assignee} options={["KJ", "AB", "Both"] as const} onChange={(v) => set("assignee", v)} styleFor={(v) => assigneeStyle[v]} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5"><Label>Size (S 1 · M 3 · L 8 pts)</Label><Seg value={d.size} options={["S", "M", "L"] as const} onChange={(v) => set("size", v)} /></div>
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

          <div className="grid gap-2">
            <Label>Sub-tasks {d.subtasks.length > 0 && <span className="text-muted-foreground">({d.subtasks.filter((s) => s.done).length}/{d.subtasks.length})</span>}</Label>
            {d.subtasks.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <Checkbox checked={s.done} onCheckedChange={(v) => set("subtasks", d.subtasks.map((x) => (x.id === s.id ? { ...x, done: !!v } : x)))} />
                <span className={cn("flex-1 text-sm", s.done && "text-muted-foreground line-through")}>{s.text}</span>
                <button type="button" aria-label="Remove sub-task" onClick={() => set("subtasks", d.subtasks.filter((x) => x.id !== s.id))} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input value={sub} onChange={(e) => setSub(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }} placeholder="Add a sub-task" />
              <Button type="button" variant="outline" onClick={addSub}><Plus /></Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Attachments</Label>
            {d.attachments.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <button type="button" onClick={() => openAtt(a)} className="flex-1 truncate text-left hover:text-primary hover:underline">{a.name}</button>
                <button type="button" aria-label="Remove attachment" onClick={() => removeAtt(a)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
              </div>
            ))}
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
            <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Paperclip />{uploading ? "Uploading…" : "Upload from device"}
            </Button>
            <div className="flex gap-2">
              <Input value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} placeholder="Paste a Google Drive share link" />
              <Button type="button" variant="outline" onClick={addDrive}>Add</Button>
            </div>
          </div>

          <div className="grid gap-1.5"><Label>Link</Label><Input type="url" value={d.link} onChange={(e) => set("link", e.target.value)} placeholder="https://" /></div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {!isNew ? <Button variant="ghost" className="text-destructive" onClick={() => onDelete(d)}><Trash2 /> Delete</Button> : <span />}
          <Button onClick={() => onSave(d)} disabled={!d.title.trim()}>Save card</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
