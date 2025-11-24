import { NextRequest, NextResponse } from 'next/server'
import { PlatformService } from '@/services/platformService'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const platform = await PlatformService.getById(params.id)

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(platform)
  } catch (error) {
    console.error('Error fetching platform:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platform' },
      { status: 500 }
    )
  }
}

import { SyncAuth } from '@/lib/sync/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const platform = await PlatformService.update(params.id, body)

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(platform)
  } catch (error) {
    console.error('Error updating platform:', error)
    return NextResponse.json(
      { error: 'Failed to update platform' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check auth
  const auth = await SyncAuth.isWriteAllowed(request)
  if (!auth.allowed) {
    return NextResponse.json(
      { error: auth.reason || 'Unauthorized' },
      { status: 403 }
    )
  }

  try {
    const success = await PlatformService.delete(params.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Platform not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting platform:', error)
    return NextResponse.json(
      { error: 'Failed to delete platform' },
      { status: 500 }
    )
  }
}
