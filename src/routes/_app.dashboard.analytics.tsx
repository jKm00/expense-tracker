import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/dashboard/analytics')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_app/dashboard/analytics"!</div>
}
