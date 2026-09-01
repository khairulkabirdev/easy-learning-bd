import { createElement, type ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  Album,
  AppWindow,
  Atom,
  Award,
  BadgeHelp,
  Banknote,
  Bell,
  BookOpen,
  BookText,
  Brain,
  Calculator,
  ChartColumn,
  ChartPie,
  CircleHelp,
  ClipboardList,
  Compass,
  Cpu,
  Drama,
  Dumbbell,
  Earth,
  FileQuestion,
  FlaskConical,
  Globe,
  GraduationCap,
  HandCoins,
  HeartPulse,
  History,
  Languages,
  Landmark,
  Library,
  Lightbulb,
  Map as MapIcon,
  MapPinned,
  Microscope,
  MonitorPlay,
  Music,
  NotebookPen,
  Palette,
  PanelsTopLeft,
  PenTool,
  Presentation,
  Puzzle,
  Rocket,
  ScrollText,
  Shapes,
  Sigma,
  Sparkles,
  Speech,
  Star,
  Tag,
  Target,
  Telescope,
  Trophy,
  Tv,
  University,
  Users,
  WandSparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const ENTITY_ICON_OPTIONS = [
  { value: "album", label: "Album", icon: Album },
  { value: "app-window", label: "App Window", icon: AppWindow },
  { value: "book-open", label: "Book Open", icon: BookOpen },
  { value: "graduation-cap", label: "Graduation Cap", icon: GraduationCap },
  { value: "library", label: "Library", icon: Library },
  { value: "notebook-pen", label: "Notebook Pen", icon: NotebookPen },
  { value: "book-text", label: "Book Text", icon: BookText },
  { value: "scroll-text", label: "Scroll Text", icon: ScrollText },
  { value: "languages", label: "Languages", icon: Languages },
  { value: "calculator", label: "Calculator", icon: Calculator },
  { value: "sigma", label: "Sigma", icon: Sigma },
  { value: "flask-conical", label: "Flask", icon: FlaskConical },
  { value: "microscope", label: "Microscope", icon: Microscope },
  { value: "brain", label: "Brain", icon: Brain },
  { value: "landmark", label: "Landmark", icon: Landmark },
  { value: "globe", label: "Globe", icon: Globe },
  { value: "earth", label: "Earth", icon: Earth },
  { value: "map", label: "Map", icon: MapIcon },
  { value: "map-pinned", label: "Map Pin", icon: MapPinned },
  { value: "compass", label: "Compass", icon: Compass },
  { value: "panels-top-left", label: "Panels", icon: PanelsTopLeft },
  { value: "shapes", label: "Shapes", icon: Shapes },
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
  { value: "wand-sparkles", label: "Wand Sparkles", icon: WandSparkles },
  { value: "tag", label: "Tag", icon: Tag },
  { value: "pen-tool", label: "Pen Tool", icon: PenTool },
  { value: "atom", label: "Atom", icon: Atom },
  { value: "trophy", label: "Trophy", icon: Trophy },
  { value: "award", label: "Award", icon: Award },
  { value: "star", label: "Star", icon: Star },
  { value: "target", label: "Target", icon: Target },
  { value: "lightbulb", label: "Lightbulb", icon: Lightbulb },
  { value: "circle-help", label: "Help Circle", icon: CircleHelp },
  { value: "badge-help", label: "Badge Help", icon: BadgeHelp },
  { value: "file-question", label: "File Question", icon: FileQuestion },
  { value: "clipboard-list", label: "Checklist", icon: ClipboardList },
  { value: "speech", label: "Speech", icon: Speech },
  { value: "presentation", label: "Presentation", icon: Presentation },
  { value: "monitor-play", label: "Monitor Play", icon: MonitorPlay },
  { value: "tv", label: "TV", icon: Tv },
  { value: "music", label: "Music", icon: Music },
  { value: "palette", label: "Palette", icon: Palette },
  { value: "drama", label: "Drama", icon: Drama },
  { value: "puzzle", label: "Puzzle", icon: Puzzle },
  { value: "history", label: "History", icon: History },
  { value: "university", label: "University", icon: University },
  { value: "banknote", label: "Banknote", icon: Banknote },
  { value: "hand-coins", label: "Hand Coins", icon: HandCoins },
  { value: "chart-column", label: "Chart Column", icon: ChartColumn },
  { value: "chart-pie", label: "Chart Pie", icon: ChartPie },
  { value: "cpu", label: "CPU", icon: Cpu },
  { value: "rocket", label: "Rocket", icon: Rocket },
  { value: "telescope", label: "Telescope", icon: Telescope },
  { value: "bell", label: "Bell", icon: Bell },
  { value: "users", label: "Users", icon: Users },
  { value: "heart-pulse", label: "Heart Pulse", icon: HeartPulse },
  { value: "dumbbell", label: "Dumbbell", icon: Dumbbell },
] as const;

const iconMap = new Map<string, ComponentType<LucideProps>>(ENTITY_ICON_OPTIONS.map((item) => [item.value, item.icon]));

type EntityVisualProps = {
  title: string;
  iconType?: string | null;
  iconName?: string | null;
  iconColor?: string | null;
  imagePath?: string | null;
  className?: string;
  imageClassName?: string;
};

export function EntityVisual({
  title,
  iconType,
  iconName,
  iconColor,
  imagePath,
  className,
  imageClassName,
}: EntityVisualProps) {
  const normalizedImagePath = imagePath?.trim() ?? "";
  const normalizedIconName = iconName?.trim() ?? "";
  const Icon = iconMap.get(normalizedIconName) ?? BookOpen;
  const color = iconColor?.trim() ? iconColor : "#0f766e";

  if (iconType === "image" && normalizedImagePath) {
    return (
      <div
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-muted/30",
          className,
        )}
      >
        <img
          src={normalizedImagePath}
          alt={title}
          className={cn("h-full w-full object-cover", imageClassName)}
        />
      </div>
    );
  }

  if (iconType === "library" && normalizedIconName) {
    return (
      <div
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-card shadow-sm",
          className,
        )}
        style={{
          color,
          background: `color-mix(in srgb, ${color} 12%, var(--card))`,
          borderColor: `color-mix(in srgb, ${color} 24%, var(--border))`,
        }}
      >
        {createElement(Icon, { className: "h-6 w-6" })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-muted/40 text-muted-foreground",
        className,
      )}
    >
      <BookOpen className="h-6 w-6" />
    </div>
  );
}
