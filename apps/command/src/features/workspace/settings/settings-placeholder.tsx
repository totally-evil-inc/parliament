import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import type { WorkspaceSettingsTabItem } from "@/features/workspace/settings"

type SettingsPlaceholderProps = {
  tab: WorkspaceSettingsTabItem
}

export function SettingsPlaceholder({ tab }: SettingsPlaceholderProps) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:px-8">
      <Empty className="min-h-64 border border-border/70 border-dashed">
        <EmptyHeader>
          <EmptyTitle>{tab.title}</EmptyTitle>
          <EmptyDescription>{tab.description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
