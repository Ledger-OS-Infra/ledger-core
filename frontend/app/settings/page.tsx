"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { MdInfo, MdTune } from "react-icons/md";

const RECONCILIATION_DEFAULTS = [
  {
    title: "Exact amount match first",
    description:
      "Payments are matched to obligations with the same amount before falling back to reference code or FIFO.",
    enabled: true,
  },
  {
    title: "Wallet credit on overpayment",
    description:
      "Excess funds after an obligation is fully paid are stored as wallet credit on the customer account.",
    enabled: true,
  },
  {
    title: "Duplicate webhook protection",
    description:
      "Repeat Nomba webhook deliveries are ignored using Redis idempotency keys.",
    enabled: true,
  },
] as const;

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function SettingsPage() {
  const { user, activeBusinessName } = useAuth();
  const workspace = user?.workspaces[0];

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Workspace preferences and reconciliation behaviour"
      />

      <div className="px-6 py-6 md:px-8  space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Active workspace
              </p>
              <p className="mt-1 text-sm font-medium">
                {activeBusinessName ?? workspace?.name ?? "No workspace"}
              </p>
            </div>
            {user && (
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant="default" size="sm">
                  {workspace ? formatRole(workspace.role) : "Member"}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MdTune className="h-5 w-5 text-primary" />
              Reconciliation engine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3 rounded-lg border border-blue-200/60 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
              <MdInfo className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-900 dark:text-blue-200">
                These rules are applied automatically on every inbound payment.
              </p>
            </div>
            {RECONCILIATION_DEFAULTS.map((item) => (
              <div
                key={item.title}
                className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/20 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.description}
                  </p>
                </div>
                <Badge variant="success" size="sm" className="shrink-0">
                  Active
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
