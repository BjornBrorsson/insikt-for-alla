import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import type { Term } from "@/lib/ordlista";
import { cn } from "@/lib/utils";

interface OrdlistaTermProps {
  term: Term;
  matchadText: string;
  className?: string;
}

export function OrdlistaTerm({ term, matchadText, className }: OrdlistaTermProps) {
  const [open, setOpen] = useState(false);

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={150} closeDelay={150}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            // Gör så att klick/tap på mobil eller tangentbord växlar rutan
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
          className={cn(
            "inline text-inherit font-inherit p-0 bg-transparent border-0 border-b border-dashed border-primary/60 hover:border-primary cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:rounded-xs transition-colors align-baseline",
            className,
          )}
          aria-label={`${matchadText} (riksdagsterm: ${term.term}. Klicka eller hovra för förklaring)`}
        >
          {matchadText}
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        side="top"
        sideOffset={6}
        className="w-80 text-left p-3.5 shadow-lg border-border/80 backdrop-blur-xs bg-popover/95 z-50 text-popover-foreground"
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
            <h4 className="font-semibold text-sm leading-tight text-foreground">{term.term}</h4>
          </div>
          <Badge variant="secondary" className="text-[11px] px-1.5 py-0 shrink-0 font-normal">
            {term.kategori}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{term.forklaring}</p>

        {term.exempel && (
          <div className="mt-2 text-[11px] text-muted-foreground/90 bg-muted/50 rounded px-2 py-1 italic border-l-2 border-primary/40">
            {term.exempel}
          </div>
        )}

        <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Riksdagsterm</span>
          <Link
            to="/ordlista"
            hash={`term-${term.slug}`}
            className="inline-flex items-center gap-0.5 text-xs text-primary font-medium hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-xs"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            Läs mer i ordlistan
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
