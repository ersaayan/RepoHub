import { NextRequest, NextResponse } from 'next/server'
import { SyncAuth } from '@/lib/sync/auth'
import { MetadataFetcher } from '@/services/metadataFetcher'
import { PackageFetcherV2 } from '@/services/packageFetcherV2'
import { WingetPackageFetcher } from '@/services/wingetPackageFetcher'
import { HomebrewPackageFetcher } from '@/services/homebrewPackageFetcher'
import { FedoraPackageFetcher } from '@/services/fedoraPackageFetcher'
import { ArchPackageFetcher } from '@/services/archPackageFetcher'

export const dynamic = 'force-dynamic'
export const maxDuration = 1800 // 30 minutes timeout for auto sync

// Simple in-memory store for last sync time (in production, use database)
let lastAutoSync: Date | null = null

export async function POST(request: NextRequest) {
  // Check auth - require sync secret or localhost
  const authResult = await SyncAuth.isSyncAllowed(request)
  if (!authResult.allowed) {
    return NextResponse.json(
      { error: 'Sync operation not allowed', reason: authResult.reason },
      { status: 403 }
    )
  }

  try {
    // Check if auto sync is enabled
    if (!SyncAuth.isAutoSyncEnabled()) {
      return NextResponse.json({
        message: 'Auto sync is disabled',
        next_sync: null
      })
    }

    // Check if enough time has passed since last sync
    const now = new Date()
    const nextSyncTime = SyncAuth.getNextSyncTime(lastAutoSync || undefined)

    if (now < nextSyncTime) {
      return NextResponse.json({
        message: 'Auto sync not due yet',
        last_sync: lastAutoSync?.toISOString(),
        next_sync: nextSyncTime.toISOString(),
        hours_until_next: Math.ceil((nextSyncTime.getTime() - now.getTime()) / (1000 * 60 * 60))
      })
    }

    console.log('🔄 Starting automatic package sync...')

    // Sync all platforms in sequence
    const syncResults = []

    try {
      // Sync Debian/Ubuntu packages
      console.log('Syncing Debian/Ubuntu packages...')
      await PackageFetcherV2.syncAll()
      syncResults.push({ platform: 'debian/ubuntu', status: 'success' })
    } catch (error) {
      console.error('Debian/Ubuntu sync failed:', error)
      syncResults.push({ platform: 'debian/ubuntu', status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' })
    }

    try {
      // Sync Windows packages (Winget)
      console.log('Syncing Windows packages...')
      const wingetFetcher = new WingetPackageFetcher()
      const wingetPackages = await wingetFetcher.fetchAllPackages()
      await wingetFetcher.storePackages(wingetPackages)
      syncResults.push({ platform: 'windows', status: 'success', package_count: wingetPackages.length })
    } catch (error) {
      console.error('Windows sync failed:', error)
      syncResults.push({ platform: 'windows', status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' })
    }

    try {
      // Sync macOS packages (Homebrew)
      console.log('Syncing macOS packages...')
      const homebrewFetcher = new HomebrewPackageFetcher()
      const homebrewPackages = await homebrewFetcher.fetchAllPackages()
      await homebrewFetcher.storePackages(homebrewPackages)
      syncResults.push({ platform: 'macos', status: 'success', package_count: homebrewPackages.length })
    } catch (error) {
      console.error('macOS sync failed:', error)
      syncResults.push({ platform: 'macos', status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' })
    }

    try {
      // Sync Fedora packages
      console.log('Syncing Fedora packages...')
      const fedoraFetcher = new FedoraPackageFetcher()
      const fedoraPackages = await fedoraFetcher.fetchAllPackages()
      await fedoraFetcher.storePackages(fedoraPackages)
      syncResults.push({ platform: 'fedora', status: 'success', package_count: fedoraPackages.length })
    } catch (error) {
      console.error('Fedora sync failed:', error)
      syncResults.push({ platform: 'fedora', status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' })
    }

    try {
      // Sync Arch packages
      console.log('Syncing Arch packages...')
      const archFetcher = new ArchPackageFetcher()
      const archPackages = await archFetcher.fetchAllPackages()
      await archFetcher.storePackages(archPackages)
      syncResults.push({ platform: 'arch', status: 'success', package_count: archPackages.length })
    } catch (error) {
      console.error('Arch sync failed:', error)
      syncResults.push({ platform: 'arch', status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' })
    }

    // Update last sync time
    lastAutoSync = now
    const nextSync = SyncAuth.getNextSyncTime(lastAutoSync)

    const successCount = syncResults.filter(r => r.status === 'success').length
    const totalCount = syncResults.length

    console.log(`✅ Auto sync completed: ${successCount}/${totalCount} platforms synced successfully`)

    return NextResponse.json({
      message: 'Auto sync completed',
      timestamp: now.toISOString(),
      last_sync: lastAutoSync.toISOString(),
      next_sync: nextSync.toISOString(),
      results: syncResults,
      summary: {
        total_platforms: totalCount,
        successful: successCount,
        failed: totalCount - successCount
      }
    })

  } catch (error) {
    console.error('Auto sync failed:', error)
    return NextResponse.json(
      {
        error: 'Auto sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  const now = new Date()
  const nextSyncTime = SyncAuth.getNextSyncTime(lastAutoSync || undefined)

  return NextResponse.json({
    auto_sync_enabled: SyncAuth.isAutoSyncEnabled(),
    auto_sync_days: SyncAuth.getAutoSyncDays(),
    last_sync: lastAutoSync?.toISOString(),
    next_sync: SyncAuth.isAutoSyncEnabled() ? nextSyncTime.toISOString() : null,
    status: lastAutoSync && now < nextSyncTime ? 'waiting' : 'ready'
  })
}
