import { NextResponse } from 'next/server'
import { query } from '@/lib/database/config'

export async function GET() {
  try {
    // Check if arch platform exists
    const platformResult = await query(
      'SELECT * FROM platforms WHERE id = $1',
      ['arch']
    )
    
    // Count arch packages
    const countResult = await query(
      'SELECT COUNT(*) FROM packages WHERE platform_id = $1',
      ['arch']
    )
    
    // Get sample packages
    const sampleResult = await query(
      'SELECT name, version, description FROM packages WHERE platform_id = $1 LIMIT 5',
      ['arch']
    )
    
    return NextResponse.json({
      platform: platformResult.rows[0] || null,
      totalPackages: parseInt(countResult.rows[0].count),
      samplePackages: sampleResult.rows
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
