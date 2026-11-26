"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Layers3, Settings2 } from "lucide-react";
import { AdminMasterCombobox } from "@/components/admin/AdminMasterCombobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BLOCK_CATALOG, BLOCK_ASSIGNMENT_KINDS, resolveBlockAssignment, type BlockAssignmentKind } from "@/app/admin/content/content-types";
import { saveBlockAssignment } from "@/app/admin/block-manager/actions";

import { getClassModelCategoryGroups, getModelQuestionCategoryGroups, resolveModelCategories, type ModelCategoryId } from "@/lib/model-question-fixed-blocks";

type Item = { id: string; name: string; code: string; slug: string; kinds: BlockAssignmentKind[] | null; categories: ModelCategoryId[] | null };
type ClassItem = Item & { subjects: Item[] };
const sections = [{ key: "library", title: "Block Library", icon: Layers3 }, { key: "classes", title: "Class Assignments", icon: BookOpen }, { key: "subjects", title: "Subject Assignments", icon: Settings2 }] as const;
const groups = ["General", "Reading", "Grammar"] as const;

// An editable draft is scoped to one class/subject. Changing selection remounts it,
// so a draft cannot be accidentally saved against another curriculum record.
function AssignmentEditor({ item, scope, currentClass, parentKinds }: { item: Item; scope: "class" | "subject"; currentClass: ClassItem; parentKinds: BlockAssignmentKind[] | null }) {
  const router = useRouter();
  const [draft, setDraft] = useState<BlockAssignmentKind[] | null>(item.kinds);
  const [saved, setSaved] = useState(item.kinds);
  const [categoryDraft, setCategoryDraft] = useState(item.categories);
  const [savedCategories, setSavedCategories] = useState(item.categories);
  const categoryGroups = scope === "class" ? getClassModelCategoryGroups(currentClass.name, currentClass.subjects) : getModelQuestionCategoryGroups(currentClass.name, item);
  const categoryDefaults = categoryGroups.map(g => g.id);
  const availableCategories = resolveModelCategories(categoryDefaults, scope === "class" ? null : currentClass.categories);
  const effectiveCategories = resolveModelCategories(availableCategories, categoryDraft);
  const toggleCategory = (id: ModelCategoryId, checked: boolean) => {
    setCategoryDraft(current => {
      const base = current ?? availableCategories;
      return checked ? [...new Set([...base, id])] : base.filter(value => value !== id);
    });
    setMessage("");
  };
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const effective = resolveBlockAssignment(parentKinds, draft) ?? BLOCK_ASSIGNMENT_KINDS;
  const chosen = draft ?? parentKinds ?? BLOCK_ASSIGNMENT_KINDS;
  const available = parentKinds ?? BLOCK_ASSIGNMENT_KINDS;
  const dirty = JSON.stringify(draft === null ? null : [...draft].sort()) !== JSON.stringify(saved === null ? null : [...saved].sort()) || JSON.stringify(categoryDraft === null ? null : [...categoryDraft].sort()) !== JSON.stringify(savedCategories === null ? null : [...savedCategories].sort());
  const toggle = (kind: BlockAssignmentKind, enabled: boolean) => setDraft(current => {
    const base = current ?? available;
    return enabled ? [...new Set([...base, kind])] : base.filter(k => k !== kind);
  });
  async function save() {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await saveBlockAssignment({ scope, id: item.id, kinds: draft, categories: categoryDraft === null ? null : categoryDraft.filter(id => categoryDefaults.includes(id)) });
      setCategoryDraft(result.categories ?? null); setSavedCategories(result.categories ?? null);
      setDraft(result.kinds); setSaved(result.kinds); setMessage("Assignments saved."); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save assignments."); }
    finally { setBusy(false); }
  }
  return <Card>
    <CardHeader><CardTitle>{item.name}</CardTitle><CardDescription>{scope === "class" ? "Set the maximum available block types for subjects in this class." : "Choose which class-assigned types this subject can use."}</CardDescription></CardHeader>
    <CardContent className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">{effective.length} / {BLOCK_CATALOG.length} assigned</Badge>
        <Badge variant="secondary">{draft === null ? scope === "class" ? "Default: unrestricted" : "Inherits class" : "Custom assignment"}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" type="button" disabled={busy} onClick={() => { setDraft(null); setMessage(""); }}>{scope === "class" ? "Use default" : "Inherit class"}</Button>
        <Button variant="outline" type="button" disabled={busy} onClick={() => { setDraft([...available]); setMessage(""); }}>Select all available</Button>
        <Button variant="outline" type="button" disabled={busy} onClick={() => { setDraft([]); setMessage(""); }}>Clear selection</Button>
      </div>
      <section className="space-y-3 border-t pt-4">
        <div><h2 className="text-base font-semibold">Model-question categories</h2><p className="text-sm text-muted-foreground">Control which question-paper groups can be used when adding new model questions. The existing paper layout and saved questions are preserved.</p></div>
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{effectiveCategories.length} / {categoryGroups.length} categories</Badge><Button type="button" variant="outline" disabled={busy} onClick={() => setCategoryDraft(null)}>{scope === "class" ? "Use class defaults" : "Inherit class categories"}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setCategoryDraft([...availableCategories])}>Select all categories</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setCategoryDraft([])}>Clear categories</Button></div>
        <div className="grid gap-3 lg:grid-cols-2">{categoryGroups.map(category => {
          const permitted = availableCategories.includes(category.id);
          const active = effectiveCategories.includes(category.id);
          const slots = category.slots.map(slot => ({ ...slot, meta: BLOCK_CATALOG.find(b => b.kind === slot.kind) }));
          return <div key={category.id} className="min-w-0 space-y-3 rounded-lg border p-4">
            <label className="flex items-start gap-3"><Checkbox checked={active} disabled={busy || !permitted} onCheckedChange={value => toggleCategory(category.id, value === true)} aria-label={category.title} /><span className="min-w-0"><span className="block font-medium">{category.title}</span><span className="block text-xs text-muted-foreground">{permitted ? category.description : "Disabled by class assignment"}</span></span></label>
            <div className="space-y-2 border-t pt-3">{slots.map(slot => <label key={slot.kind} className="flex items-start gap-2 text-sm"><Checkbox aria-label={`${category.title}: ${slot.meta?.title ?? slot.kind}`} checked={available.includes(slot.kind) && chosen.includes(slot.kind)} disabled={busy || !active || !available.includes(slot.kind)} onCheckedChange={value => { toggle(slot.kind, value === true); setMessage(""); }} /><span className="min-w-0">{slot.kind === "seen-passage-one" && category.id === "seen" ? "Seen Passage" : slot.kind === "paragraph" && category.id === "unseen" ? "Unseen Passage" : slot.meta?.title ?? slot.kind}</span></label>)}</div>
          </div>;
        })}</div>
        <p className="text-xs text-muted-foreground">Category switches apply to model papers only. Block checkboxes share the existing class/subject block assignments below and also affect regular content creation.</p>
      </section>
      <div className="border-t pt-4"><h2 className="text-base font-semibold">All content block types</h2><p className="text-sm text-muted-foreground">Manage individual blocks for regular content and model questions.</p></div>
      <Input aria-label="Search block types" placeholder="Search blocks..." value={search} onChange={e => setSearch(e.target.value)} />
      {groups.map(group => { const entries = BLOCK_CATALOG.filter(b => b.group === group && `${b.title} ${b.kind}`.toLowerCase().includes(search.trim().toLowerCase())); if (!entries.length) return null; return <section key={group} className="space-y-3">
        <h3 className="text-sm font-semibold">{group}</h3>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{entries.map(block => { const permitted = available.includes(block.kind); return <label key={block.kind} className="flex min-h-16 min-w-0 items-start gap-3 rounded-lg border p-3 hover:bg-muted/30">
          <Checkbox aria-label={block.title} className="mt-1" checked={permitted && chosen.includes(block.kind)} disabled={busy || !permitted} onCheckedChange={checked => { toggle(block.kind, checked === true); setMessage(""); }} />
          <span className="min-w-0 space-y-1"><span className="block text-sm font-medium">{block.title}</span><span className="block text-xs leading-relaxed text-muted-foreground">{permitted ? block.description : "Not assigned to this class"}</span></span>
        </label>; })}</div>
      </section>; })}
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      {message ? <p role="status" className="text-sm text-primary">{message}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-xs text-muted-foreground">Existing content is not deleted or hidden from students.</p><Button type="button" disabled={busy || !dirty} onClick={save}>{busy ? "Saving…" : "Save assignments"}</Button></div>
    </CardContent>
  </Card>;
}

export function BlockAssignmentManager({ section, classes }: { section: "library" | "classes" | "subjects"; classes: ClassItem[] }) {
  const [classId, setClassId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const currentClass = classes.find(c => c.id === classId);
  const subject = currentClass?.subjects.find(s => s.id === subjectId);
  const title = sections.find(s => s.key === section)?.title ?? "Block Manager";
  const options = (items: Item[]) => {
    const label = (item: Item) => `${item.name}${item.code ? ` (${item.code})` : ""}`;
    return items.map(item => ({ id: item.id, label: items.filter(other => label(other) === label(item)).length > 1 ? `${label(item)} · ${item.id.slice(-6)}` : label(item) }));
  };
  return <div className="space-y-6">
    <div className="space-y-1"><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="text-sm text-muted-foreground">Manage implemented block types and their availability for classes and subjects.</p></div>
    <nav aria-label="Block manager sections" className="flex flex-wrap gap-2">{sections.map(({key,title,icon:Icon}) => <Link aria-current={key === section ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium ${key === section ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`} key={key} href={`/admin/block-manager/${key}`}><Icon className="size-4" />{title}</Link>)}</nav>
    <div className="grid gap-3 sm:grid-cols-3">{[["Registered blocks", BLOCK_CATALOG.length], ["Classes", classes.length], ["Subjects", classes.reduce((n,c) => n+c.subjects.length,0)]].map(([label,value]) => <Card key={label}><CardContent><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></CardContent></Card>)}</div>
    {section === "library" ? <Card><CardHeader><CardTitle>Available block types</CardTitle><CardDescription>Registered editors and standalone exercise sections. Assign these types using the class or subject tabs.</CardDescription></CardHeader><CardContent className="space-y-4"><Input aria-label="Search block library" placeholder="Search block library..." value={search} onChange={e=>setSearch(e.target.value)} />{groups.map(group => { const entries = BLOCK_CATALOG.filter(b => b.group === group && `${b.title} ${b.kind}`.toLowerCase().includes(search.trim().toLowerCase())); return entries.length ? <section key={group} className="space-y-2"><h2 className="text-base font-semibold">{group}</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{entries.map(block => <div key={block.kind} className="rounded-lg border p-4 space-y-2"><p className="font-medium">{block.title}</p><p className="text-xs break-all text-muted-foreground">{block.kind}</p><p className="text-sm text-muted-foreground">{block.description}</p></div>)}</div></section> : null; })}</CardContent></Card> : <>
      <Card><CardContent className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><p className="text-sm font-medium">Class</p><AdminMasterCombobox value={classId} options={options(classes)} onChange={id => {setClassId(id); setSubjectId(null);}} placeholder="Choose a class" emptyText="No classes found." /></div>{section === "subjects" ? <div className="space-y-2"><p className="text-sm font-medium">Subject</p><AdminMasterCombobox value={subjectId} options={options(currentClass?.subjects ?? [])} disabled={!currentClass} onChange={setSubjectId} placeholder="Choose a subject" emptyText="No subjects found." /></div> : null}</CardContent></Card>
      {section === "classes" && currentClass ? <AssignmentEditor key={currentClass.id} item={currentClass} scope="class" currentClass={currentClass} parentKinds={null} /> : section === "subjects" && currentClass && subject ? <AssignmentEditor key={`${currentClass.id}:${subject.id}`} item={subject} scope="subject" currentClass={currentClass} parentKinds={currentClass.kinds} /> : <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Select {section === "classes" ? "a class" : "a class and subject"} to manage assignments.</p>}
    </>}
    <p className="text-xs text-muted-foreground">Assignments limit new blocks in supported editors. Model-question categories follow class and subject profiles; fixed examination layouts still determine which types are supported. This is not a content deletion or publishing tool.</p>
  </div>;
}
