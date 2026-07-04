import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ButtonCustom } from '@/components/ui/button-custom'
import { Badge } from '@/components/ui/badge'
import { MdContentCopy, MdCheck } from 'react-icons/md'

export default function SettingsPage() {
  const webhookUrl = 'https://ledger-core.example.com/webhooks/nomba'

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure and manage your Ledger-Core instance"
      />

      <div className="px-8 py-6 max-w-2xl space-y-6">
        {/* Nomba Connection */}
        <Card>
          <CardHeader>
            <CardTitle>Nomba Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
           
            <div>
              <p className="text-sm font-medium mb-2">Webhook URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono text-muted-foreground break-all">
                  {webhookUrl}
                </code>
                <ButtonCustom variant="ghost" size="sm">
                  <MdContentCopy className="h-4 w-4" />
                </ButtonCustom>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Matching Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Matching Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border">
              <div>
                <p className="text-sm font-medium">Exact Match First</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Prioritize exact amount matches before fallback rules
                </p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border">
              <div>
                <p className="text-sm font-medium">Auto-Apply Credit</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically apply wallet credit to obligations
                </p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border">
              <div>
                <p className="text-sm font-medium">Flag Duplicates</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Highlight potential duplicate payments for review
                </p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Team Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Team Members</CardTitle>
              <ButtonCustom variant="primary" size="sm">
                Invite Teammate
              </ButtonCustom>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'You', email: 'user@example.com', role: 'Admin' },
                { name: 'Jane Smith', email: 'jane@example.com', role: 'Editor' },
              ].map((member) => (
                <div
                  key={member.email}
                  className="flex items-center justify-between p-3 border border-border rounded hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                  <Badge variant="default" size="sm">
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
