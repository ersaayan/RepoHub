import { RepoHubApp } from '@/components/RepoHubApp'

export default function HomePage() {
  const cryptomusEnabled = process.env.CRYPTOMUS_ENABLED !== 'false'
  return <RepoHubApp cryptomusEnabled={cryptomusEnabled} />
}
