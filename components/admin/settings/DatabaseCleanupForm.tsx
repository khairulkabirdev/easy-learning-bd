"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, ShieldCheck, Trash2, RefreshCw } from "lucide-react";
import { clearContentTablesAction } from "@/app/admin/settings/actions";
import type { CleanupPreview } from "@/lib/admin/database-cleanup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DatabaseCleanupForm({ preview, confirmationPhrase }: { preview: CleanupPreview; confirmationPhrase: string }) {
  const router = useRouter();
  const [includeTopics, setIncludeTopics] = useState(true);
  const [confirmation, setConfirmation] = useState("");
  const [state, action, pending] = useActionState(clearContentTablesAction, { error: "", success: "" });
  const willClear = (table: CleanupPreview["tables"][number]) => table.disposition === "content" || (table.disposition === "topic" && includeTopics);
  const selected = preview.tables.filter(willClear);
  const deleteCount = selected.reduce((sum, table) => sum + table.count, 0);
  const protectedCount = preview.tables.length - selected.length;
  const format = (n: number) => n.toLocaleString("en-US");

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Database tables", value: preview.tables.length, icon: Database },
          { label: "Records to remove", value: deleteCount, icon: Trash2 },
          { label: "Protected tables", value: protectedCount, icon: ShieldCheck },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="gap-2">
              <div className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4" aria-hidden="true" />{label}</div>
              <CardTitle className="text-2xl font-semibold tabular-nums">{format(value)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      {preview.blocked && <Alert variant="destructive"><AlertTitle>Cleanup unavailable</AlertTitle><AlertDescription>{preview.blocked}</AlertDescription></Alert>}
      <form action={action} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Content cleanup</CardTitle>
            <CardDescription>Clear lesson content, exercise blocks, answer keys, standalone exercises, model-question sets and imported-question records. Classes, Subjects, Units and Lessons are always kept.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox checked={includeTopics} onCheckedChange={value => { setIncludeTopics(value === true); setConfirmation(""); }} disabled={pending || !!preview.blocked} />
              <span className="space-y-1"><span className="block font-medium">Also clear Topics</span><span className="block text-sm text-muted-foreground">Uncheck to keep topic headings and structure under lessons.</span></span>
            </label>
            <Alert variant="destructive">
              <Trash2 aria-hidden="true" />
              <AlertTitle>Permanent deletion</AlertTitle>
              <AlertDescription>Stop other content imports or editing before cleanup. A private SQLite backup is created before any deletion. Accounts, board/year records, settings, uploaded file records and physical media are retained. Vocabulary upload links are detached when their entries are removed. No table schema is dropped.</AlertDescription>
            </Alert>
            <input type="hidden" name="previewToken" value={preview.token} />
            <input type="hidden" name="includeTopics" value={includeTopics ? "yes" : "no"} />
            <div className="space-y-2">
              <label htmlFor="cleanup-confirmation" className="text-sm font-medium">Type {confirmationPhrase} to confirm deletion of {format(deleteCount)} records.</label>
              <Input id="cleanup-confirmation" name="confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} disabled={pending || !!preview.blocked || deleteCount === 0} placeholder={confirmationPhrase} />
            </div>
            {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
            {state.success && <p role="status" className="text-sm break-all">{state.success}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="destructive" disabled={pending || !!preview.blocked || deleteCount === 0 || confirmation !== confirmationPhrase}><Trash2 aria-hidden="true" />{pending ? "Backing up and clearing…" : "Clear selected content"}</Button>
              <Button type="button" variant="outline" disabled={pending} onClick={() => { setConfirmation(""); router.refresh(); }}><RefreshCw aria-hidden="true" />Refresh preview</Button>
            </div>
          </CardContent>
        </Card>
      </form>
      <Card>
        <CardHeader><CardTitle>Database tables</CardTitle><CardDescription>Live record counts and cleanup status. Protected tables cannot be cleared here.</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Table name</TableHead><TableHead className="text-right">Records</TableHead><TableHead>Cleanup action</TableHead></TableRow></TableHeader>
            <TableBody>
              {preview.tables.map(table => (
                <TableRow key={table.name}>
                  <TableCell className="whitespace-normal break-all font-medium">{table.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{format(table.count)}</TableCell>
                  <TableCell><Badge variant={willClear(table) ? "destructive" : "outline"}>{willClear(table) ? "Clear records" : "Keep"}</Badge></TableCell>
                </TableRow>
              ))}
              {!preview.tables.length && <TableRow><TableCell colSpan={3} className="text-muted-foreground">No table preview available.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
