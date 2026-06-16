import { createFileRoute } from '@tanstack/react-router'
import Editor from '@/features/workspace/editor/editor'

export const Route = createFileRoute('/_workspace/proposals/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='grid place-items-center p-4'>
      <div className='min-w-200 min-h-200 p-4 bg-card shadow'>
        <Editor />
      </div>
    </div>
  )
}
