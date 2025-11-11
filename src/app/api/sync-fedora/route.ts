import { NextRequest, NextResponse } from 'next/server'
import { FedoraPackageFetcher } from '@/services/fedoraPackageFetcher'
import { SyncAuth } from '@/lib/sync/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes timeout

let syncInProgress = false
let syncStatus = {
  status: 'idle' as 'idle' | 'fetching' | 'storing' | 'complete' | 'error',
  fetchProgress: 0,
  fetchTotal: 0,
  storeProgress: 0,
  storeTotal: 0,
  currentPackage: '',
  error: null as string | null
}

export async function GET() {
  return NextResponse.json(syncStatus)
}

export async function POST(request: NextRequest) {
  // Check if sync is allowed
  const authResult = await SyncAuth.isSyncAllowed(request)
  if (!authResult.allowed) {
    return NextResponse.json(
      { error: 'Sync operation not allowed', reason: authResult.reason },
      { status: 403 }
    )
  }

  if (syncInProgress) {
    return NextResponse.json(
      { error: 'Sync already in progress' },
      { status: 409 }
    )
  }

  syncInProgress = true
  syncStatus = {
    status: 'fetching',
    fetchProgress: 0,
    fetchTotal: 0,
    storeProgress: 0,
    storeTotal: 0,
    currentPackage: '',
    error: null
  }

  // Start sync in background
  ;(async () => {
    try {
      const fetcher = new FedoraPackageFetcher()
      
      // Fetch packages
      console.log('🔄 Starting Fedora package fetch...')
      const packages = await fetcher.fetchAllPackages(
        (current, total, packageName) => {
          syncStatus.fetchProgress = current
          syncStatus.fetchTotal = total
          syncStatus.currentPackage = packageName
        }
      )
      
      console.log(`✅ Fetched ${packages.length} Fedora packages`)
      
      // Store packages
      syncStatus.status = 'storing'
      syncStatus.storeTotal = packages.length
      
      await fetcher.storePackages(
        packages,
        (current, total) => {
          syncStatus.storeProgress = current
          syncStatus.storeTotal = total
        }
      )
      
      syncStatus.status = 'complete'
      console.log('✅ Fedora sync completed successfully')
      
    } catch (error) {
      console.error('❌ Fedora sync error:', error)
      syncStatus.status = 'error'
      syncStatus.error = error instanceof Error ? error.message : 'Unknown error'
    } finally {
      syncInProgress = false
    }
  })()

  return NextResponse.json({ 
    message: 'Fedora package sync started',
    status: syncStatus 
  })
}
