import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/dashboard/tags/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_app/dashboard/tags/"!</div>
}
