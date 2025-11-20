
import { apiClient } from '../src/lib/api/client'

// Mock fetch for testing if running outside of browser/node with fetch
if (!global.fetch) {
    console.error("Fetch is not available")
    process.exit(1)
}

async function testRateLimitWithHeaders() {
    console.log('🚀 Starting Rate Limit Test with Headers...')

    const url = 'http://localhost:3002/api/packages?limit=1'
    const headers = {
        'CF-Connecting-IP': '1.2.3.4'
    }

    let successCount = 0
    let failCount = 0

    const startTime = Date.now()

    // Limit is 50, so we send 60 requests
    for (let i = 0; i < 60; i++) {
        try {
            const res = await fetch(url, { headers })
            if (res.status === 200) {
                successCount++
                process.stdout.write('.')
            } else if (res.status === 429) {
                failCount++
                process.stdout.write('x')
            } else {
                console.log(`\nUnexpected status: ${res.status}`)
            }
        } catch (e) {
            console.error(`\nRequest failed: ${e}`)
        }
    }

    const duration = (Date.now() - startTime) / 1000
    console.log(`\n\n📊 Results for IP 1.2.3.4:`)
    console.log(`Time: ${duration.toFixed(2)}s`)
    console.log(`Success: ${successCount}`)
    console.log(`Rate Limited: ${failCount}`)

    if (failCount > 0) {
        console.log('✅ Rate limiting with CF-Connecting-IP is working!')
    } else {
        console.log('❌ Rate limiting did NOT trigger.')
    }
}

testRateLimitWithHeaders()
