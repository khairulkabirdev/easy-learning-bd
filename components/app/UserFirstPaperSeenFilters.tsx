"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";

import { AdminSelectField as SelectField } from "@/components/admin/AdminSelectField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type UnitOption = { id: string; title: string; unitNumber: string };
type LessonOption = { id: string; unitId: string; title: string; lessonNumber: string };
type TopicOption = { id: string; lessonId: string; title: string; topicNumber: string };

export function UserFirstPaperSeenFilters({
  subjectId,
  units,
  lessons,
  topics,
  current,
}: {
  subjectId: string;
  units: UnitOption[];
  lessons: LessonOption[];
  topics: TopicOption[];
  current: { unitId: string; lessonId: string; topicId: string; q: string };
}) {
  const router = useRouter();
  const [filter, setFilter] = useState(current);

  const lessonOptions = useMemo(
    () => lessons.filter((item) => item.unitId === filter.unitId),
    [filter.unitId, lessons],
  );
  const topicOptions = useMemo(
    () => topics.filter((item) => item.lessonId === filter.lessonId),
    [filter.lessonId, topics],
  );

  function apply() {
    const params = new URLSearchParams();
    if (filter.unitId) params.set("unitId", filter.unitId);
    if (filter.lessonId) params.set("lessonId", filter.lessonId);
    if (filter.topicId) params.set("topicId", filter.topicId);
    if (filter.q.trim()) params.set("q", filter.q.trim());
    params.set("page", "1");
    router.push(`/user/chapter-preparation/subjects/${subjectId}/seen-composition?${params.toString()}`);
  }

  function clear() {
    setFilter({ unitId: "", lessonId: "", topicId: "", q: "" });
    router.push(`/user/chapter-preparation/subjects/${subjectId}/seen-composition`);
  }

  const isApplied = Boolean(current.unitId && current.lessonId);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-4 w-4 text-primary" />
              Based on curriculum
            </CardTitle>
            <CardDescription>
              Select Unit and Lesson first. Topic is optional.
            </CardDescription>
          </div>
          <Badge variant={isApplied ? "secondary" : "outline"}>
            {isApplied ? "Selection applied" : "Choose unit & lesson"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <FieldGroup className="grid gap-4 md:grid-cols-3">
          <SelectField
            label="Unit"
            value={filter.unitId}
            onChange={(unitId) => setFilter({ unitId, lessonId: "", topicId: "", q: filter.q })}
            options={units.map((item) => ({
              id: item.id,
              label: item.unitNumber ? `${item.unitNumber} · ${item.title}` : item.title,
            }))}
            placeholder="Select unit"
          />
          <SelectField
            label="Lesson"
            value={filter.lessonId}
            onChange={(lessonId) => setFilter((value) => ({ ...value, lessonId, topicId: "" }))}
            options={lessonOptions.map((item) => ({
              id: item.id,
              label: item.lessonNumber ? `${item.lessonNumber} · ${item.title}` : item.title,
            }))}
            placeholder={filter.unitId ? "Select lesson" : "Select unit first"}
            disabled={!filter.unitId}
          />
          <SelectField
            label="Topic"
            value={filter.topicId}
            onChange={(topicId) => setFilter((value) => ({ ...value, topicId }))}
            options={topicOptions.map((item) => ({
              id: item.id,
              label: item.topicNumber ? `${item.topicNumber} · ${item.title}` : item.title,
            }))}
            placeholder={filter.lessonId ? "All topics / optional" : "Select lesson first"}
            disabled={!filter.lessonId}
          />
        </FieldGroup>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <label htmlFor="seen-search" className="text-sm font-medium">Search title</label>
            <Input
              id="seen-search"
              value={filter.q}
              onChange={(event) => setFilter((value) => ({ ...value, q: event.target.value }))}
              placeholder="Search Seen Composition..."
              onKeyDown={(event) => {
                if (event.key === "Enter" && filter.unitId && filter.lessonId) apply();
              }}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={clear} className="min-h-10">
              <RotateCcw className="h-4 w-4" />
              Clear
            </Button>
            <Button
              type="button"
              onClick={apply}
              disabled={!filter.unitId || !filter.lessonId}
              className="min-h-10"
            >
              Show content
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
