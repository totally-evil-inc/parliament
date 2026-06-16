import { createFileRoute } from '@tanstack/react-router'
import Editor from '@/features/workspace/editor/editor'

export const Route = createFileRoute('/_workspace/proposals/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='grid place-items-center p-4'>
      <Editor />
    </div>
  )
}
