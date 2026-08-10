import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";

export function PortalHeader({
  businessName,
  initials,
  backHref,
  backLabel,
}: {
  businessName?: string;
  initials?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[480px] items-center justify-between px-5">
        <div className="flex min-w-0 items-center gap-1.5">
          {backHref ? (
            <Link
              href={backHref}
              aria-label={backLabel ?? "Go back"}
              className="-ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-secondary"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
            </Link>
          ) : null}
          <span className="flex shrink-0 items-center gap-1.5 text-[15px] font-medium">
            Ledger-Core
            <span className="sidebar-logo-dot" aria-hidden="true" />
          </span>
        </div>

        {businessName ? (
          <span className="truncate px-2 text-sm text-muted-foreground">
            {businessName}
          </span>
        ) : null}

        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          {initials ? (
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          ) : null}
        </div>
      </div>
    </header>
  );
}
