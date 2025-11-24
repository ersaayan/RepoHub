import { NextRequest, NextResponse } from 'next/server'
import { PlatformInitializer } from '@/services/platformInitializer'
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
    await PlatformInitializer.initializePlatforms()
    return NextResponse.json({ 
      success: true, 
      message: 'Platforms initialized successfully' 
    })
  } catch (error) {
    console.error('Error initializing platforms:', error)
    return NextResponse.json(
      { error: 'Failed to initialize platforms' },
      { status: 500 }
    )
  }
}
