import { NextRequest, NextResponse } from 'next/server'
import { PlatformService } from '@/services/platformService'

export async function GET() {
  try {
    const platforms = await PlatformService.getAll()
    return NextResponse.json(platforms)
  } catch (error) {
    console.error('Error fetching platforms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platforms' },
      { status: 500 }
    )
  }
}

import { SyncAuth } from '@/lib/sync/auth'

export async function POST(request: NextRequest) {
  // Check auth
  const auth = await SyncAuth.isWriteAllowed(request)
  if (!auth.allowed) {
    return NextResponse.json(
      { error: auth.reason || 'Unauthorized' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const platform = await PlatformService.create(body)
    return NextResponse.json(platform, { status: 201 })
  } catch (error) {
    console.error('Error creating platform:', error)
    return NextResponse.json(
      { error: 'Failed to create platform' },
      { status: 500 }
    )
  }
}
