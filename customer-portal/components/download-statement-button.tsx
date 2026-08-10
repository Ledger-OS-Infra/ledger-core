"use client";

import { FileDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useDownloadStatementMutation } from "@/lib/queries";

export function DownloadStatementButton() {
  const download = useDownloadStatementMutation();

  return (
    <div>
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => download.mutate()}
        disabled={download.isPending}
      >
        {download.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
        ) : (
          <FileDown className="h-4 w-4" strokeWidth={1.75} />
        )}
        {download.isPending ? "Preparing statement…" : "Download statement (PDF)"}
      </Button>
      {download.isError ? (
        <p className="mt-2 text-center text-sm text-destructive">
          {download.error instanceof ApiError
            ? download.error.message
            : "Couldn't generate your statement. Please try again."}
        </p>
      ) : null}
    </div>
  );
}
