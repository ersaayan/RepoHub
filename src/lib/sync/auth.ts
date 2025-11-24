import { NextRequest } from 'next/server'

export class SyncAuth {
  private static readonly SERVER_ONLY = process.env.SYNC_SERVER_ONLY === 'true'
  private static readonly SYNC_SECRET = process.env.SYNC_SECRET_KEY

  /**
   * Check if sync operations are allowed from the current request
   */
  static async isSyncAllowed(request: NextRequest): Promise<{ allowed: boolean; reason?: string }> {
    // If server-only mode is disabled, allow all requests
    if (!this.SERVER_ONLY) {
      return { allowed: true }
    }

    // In server-only mode, check for secret key in header
    const secretKey = request.headers.get('x-sync-secret')
    
    if (!this.SYNC_SECRET) {
      return { 
        allowed: false, 
        reason: 'Sync secret key not configured on server' 
      }
    }

    if (!secretKey) {
      return { 
        allowed: false, 
        reason: 'Sync secret key required in server-only mode' 
      }
    }

    if (secretKey !== this.SYNC_SECRET) {
      return { 
        allowed: false, 
        reason: 'Invalid sync secret key' 
      }
    }

    // Additional check: verify request is from localhost or same server
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    
    const allowedIPs = ['127.0.0.1', 'localhost', '::1']
    const isLocalRequest = allowedIPs.includes(clientIP.split(',')[0].trim())

    if (!isLocalRequest && secretKey !== this.SYNC_SECRET) {
      return { 
        allowed: false, 
        reason: 'Sync operations only allowed from server in server-only mode' 
      }
    }

    return { allowed: true }
  }

  /**
   * Check if write operations (create/update/delete) are allowed
   * ALWAYS requires authentication (secret key or localhost), ignoring SYNC_SERVER_ONLY
   */
  static async isWriteAllowed(request: NextRequest): Promise<{ allowed: boolean; reason?: string }> {
    // Always enforce auth for writes
    const secretKey = request.headers.get('x-sync-secret')
    
    // Check localhost
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    
    const allowedIPs = ['127.0.0.1', 'localhost', '::1']
    const isLocalRequest = allowedIPs.includes(clientIP.split(',')[0].trim())

    if (isLocalRequest) {
        return { allowed: true }
    }

    if (!this.SYNC_SECRET) {
      return { 
        allowed: false, 
        reason: 'Secret key not configured on server' 
      }
    }

    if (secretKey === this.SYNC_SECRET) {
        return { allowed: true }
    }

    return { 
        allowed: false, 
        reason: 'Write operations require authentication' 
    }
  }

  /**
   * Get automatic sync frequency in days
   */
  static getAutoSyncDays(): number {
    const days = parseInt(process.env.AUTO_SYNC_DAYS || '1', 10)
    return isNaN(days) ? 1 : Math.max(0, days)
  }

  /**
   * Check if automatic sync is enabled
   */
  static isAutoSyncEnabled(): boolean {
    return this.getAutoSyncDays() > 0
  }

  /**
   * Get the next sync time based on frequency
   */
  static getNextSyncTime(lastSyncTime?: Date): Date {
    const days = this.getAutoSyncDays()
    if (days === 0) {
      return new Date(0) // Return epoch time if disabled
    }
    
    const nextSync = new Date(lastSyncTime || new Date())
    nextSync.setDate(nextSync.getDate() + days)
    return nextSync
  }
}
