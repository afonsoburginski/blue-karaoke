// Server component: evita prerender estático que causa "unstable_prefetch.mode" no CI
export const dynamic = "force-dynamic"

import HomeClient from "./home-client"

export default function Page() {
  return <HomeClient />
}
