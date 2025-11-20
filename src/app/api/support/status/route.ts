import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CRYPTOMUS_ENABLED = process.env.CRYPTOMUS_ENABLED !== 'false'

export async function GET() {
  return NextResponse.json({
    cryptomus_enabled: CRYPTOMUS_ENABLED
  })
}
