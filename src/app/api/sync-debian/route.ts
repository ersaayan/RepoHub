import { NextRequest, NextResponse } from 'next/server'
import { DebianPackageFetcher } from '@/services/debianPackageFetcher'
import { query } from '@/lib/database/config'
import { SyncAuth } from '@/lib/sync/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

let syncInProgress = false
let syncStatus = {
  status: 'idle' as 'idle' | 'running' | 'complete' | 'error',
  error: null as string | null
}

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
      await DebianPackageFetcher.fetchDebianPackages()
      // Prune not-seen Debian packages (platform debian)
      const graceDays = parseInt(process.env.PRUNE_GRACE_DAYS || '0', 10)
      const cutoff = new Date(runStartedAt.getTime() - (graceDays > 0 ? graceDays : 0) * 24 * 60 * 60 * 1000)
      await query(
        `UPDATE packages
         SET is_active = false
         WHERE platform_id = $1
           AND is_active = true
           AND (last_seen_at IS NULL OR last_seen_at < $2)`,
        ['debian', cutoff]
      )
      const hardDays = parseInt(process.env.PRUNE_HARD_DELETE_DAYS || '0', 10)
      if (hardDays > 0) {
        const deleteCutoff = new Date(runStartedAt.getTime() - hardDays * 24 * 60 * 60 * 1000)
        await query(
          `DELETE FROM packages
           WHERE platform_id = $1
             AND is_active = false
             AND last_seen_at IS NOT NULL AND last_seen_at < $2`,
          ['debian', deleteCutoff]
        )
      }
      syncStatus.status = 'complete'
    } catch (error) {
      syncStatus.status = 'error'
      syncStatus.error = error instanceof Error ? error.message : 'Unknown error'
    } finally {
      syncInProgress = false
    }
  })()

  return NextResponse.json({ message: 'Debian packages sync started', status: syncStatus })
}
