import { NextRequest, NextResponse } from 'next/server'
import { SyncAuth } from '@/lib/sync/auth'
import { query } from '@/lib/database/config'
import { AurPackageFetcher } from '@/services/aurPackageFetcher'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

let syncInProgress = false
let syncStatus: {
  status: 'idle' | 'running' | 'complete' | 'error'
  error: string | null
} = { status: 'idle', error: null }

export async function GET() {
  return NextResponse.json(syncStatus)
}

export async function POST(request: NextRequest) {
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
  syncStatus = { status: 'running', error: null }

  ;(async () => {
    try {
      const runStartedAt = new Date()
      const fetcher = new AurPackageFetcher()
      const pkgs = await fetcher.fetchAllPackages()
      await fetcher.storePackages(pkgs)
      // Prune not-seen AUR packages for this run
      const graceDays = parseInt(process.env.PRUNE_GRACE_DAYS || '0', 10)
      const cutoff = new Date(runStartedAt.getTime() - (graceDays > 0 ? graceDays : 0) * 24 * 60 * 60 * 1000)
      await query(
        `UPDATE packages
         SET is_active = false
         WHERE platform_id = $1
           AND repository = $2
           AND is_active = true
           AND (last_seen_at IS NULL OR last_seen_at < $3)`,
        ['arch', 'aur', cutoff]
      )
      // Optional hard delete of long-inactive AUR packages
      const hardDays = parseInt(process.env.PRUNE_HARD_DELETE_DAYS || '0', 10)
      if (hardDays > 0) {
        const deleteCutoff = new Date(runStartedAt.getTime() - hardDays * 24 * 60 * 60 * 1000)
        await query(
          `DELETE FROM packages
           WHERE platform_id = $1
             AND repository = $2
             AND is_active = false
             AND last_seen_at IS NOT NULL AND last_seen_at < $3`,
          ['arch', 'aur', deleteCutoff]
        )
      }
      syncStatus.status = 'complete'
    } catch (err: any) {
      syncStatus.status = 'error'
      syncStatus.error = err?.message || 'Unknown error'
    } finally {
      syncInProgress = false
    }
  })()

  return NextResponse.json({ message: 'AUR sync started', status: syncStatus })
}
