import { NextRequest, NextResponse } from 'next/server'
import { ArchPackageFetcher } from '@/services/archPackageFetcher'
import { query } from '@/lib/database/config'
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
      const runStartedAt = new Date()
      const fetcher = new ArchPackageFetcher()
      
      // Fetch packages
      console.log('🔄 Starting Arch Linux package fetch...')
      const packages = await fetcher.fetchAllPackages(
        (current, total, packageName) => {
          syncStatus.fetchProgress = current
          syncStatus.fetchTotal = total
          syncStatus.currentPackage = packageName
        }
      )
      
      console.log(`✅ Fetched ${packages.length} Arch packages`)
      
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
      // Prune packages not seen in this run (Arch official scope)
      const graceDays = parseInt(process.env.PRUNE_GRACE_DAYS || '0', 10)
      const cutoff = new Date(runStartedAt.getTime() - (graceDays > 0 ? graceDays : 0) * 24 * 60 * 60 * 1000)
      await query(
        `UPDATE packages
         SET is_active = false
         WHERE platform_id = $1
           AND repository = $2
           AND is_active = true
           AND (last_seen_at IS NULL OR last_seen_at < $3)`,
        ['arch', 'official', cutoff]
      )
      // Optional hard delete of long-inactive packages
      const hardDays = parseInt(process.env.PRUNE_HARD_DELETE_DAYS || '0', 10)
      if (hardDays > 0) {
        const deleteCutoff = new Date(runStartedAt.getTime() - hardDays * 24 * 60 * 60 * 1000)
        await query(
          `DELETE FROM packages
           WHERE platform_id = $1
             AND repository = $2
             AND is_active = false
             AND last_seen_at IS NOT NULL AND last_seen_at < $3`,
          ['arch', 'official', deleteCutoff]
        )
      }
      
      syncStatus.status = 'complete'
      console.log('✅ Arch Linux sync completed successfully')
      
    } catch (error) {
      console.error('❌ Arch sync error:', error)
      syncStatus.status = 'error'
      syncStatus.error = error instanceof Error ? error.message : 'Unknown error'
    } finally {
      syncInProgress = false
    }
  })()

  return NextResponse.json({ 
    message: 'Arch Linux package sync started',
    status: syncStatus 
  })
}
