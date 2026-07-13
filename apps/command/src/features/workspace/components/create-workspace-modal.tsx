import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import type { CreatedOrg } from "./create-workspace-form"
import { CreateWorkspaceForm } from "./create-workspace-form"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (org: CreatedOrg) => void
}

export function CreateWorkspaceModal({ open, onOpenChange, onSuccess }: Props) {
  const handleSuccess = (org: CreatedOrg) => {
    onOpenChange(false)
    onSuccess?.(org)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a new workspace</DialogTitle>
          <DialogDescription>
            You can change these details later in settings.
          </DialogDescription>
        </DialogHeader>
        <CreateWorkspaceForm
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
