#!/bin/bash

# Server-side sync script for RepoHub
# This script can only be run from the server itself when SYNC_SERVER_ONLY=true

set -e

# Configuration
API_URL="${API_URL:-http://localhost:3002}"
SYNC_SECRET="${SYNC_SECRET_KEY}"
LOG_FILE="/var/log/repohub-sync.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${GREEN}$(date '+%Y-%m-%d %H:%M:%S') - INFO: $1${NC}" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}$(date '+%Y-%m-%d %H:%M:%S') - WARN: $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}$(date '+%Y-%m-%d %H:%M:%S') - ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

# Check if required environment variables are set
check_env() {
    if [ -z "$SYNC_SECRET" ]; then
        log_error "SYNC_SECRET_KEY environment variable is required"
        exit 1
    fi
    
    log_info "Environment variables validated"
}

# Perform sync for a specific platform
sync_platform() {
    local platform="$1"
    log_info "Starting sync for platform: $platform"
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "x-sync-secret: $SYNC_SECRET" \
        -d '{}' \
        "$API_URL/api/sync-$platform")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        log_info "Successfully synced $platform: $body"
        return 0
    else
        log_error "Failed to sync $platform (HTTP $http_code): $body"
        return 1
    fi
}

# Perform auto sync
auto_sync() {
    log_info "Starting automatic sync for all platforms"
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "x-sync-secret: $SYNC_SECRET" \
        -d '{}' \
        "$API_URL/api/auto-sync")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        log_info "Auto sync completed successfully: $body"
        return 0
    else
        log_error "Auto sync failed (HTTP $http_code): $body"
        return 1
    fi
}

# Get sync status
get_status() {
    log_info "Getting sync status"
    
    response=$(curl -s -w "\n%{http_code}" -X GET \
        -H "x-sync-secret: $SYNC_SECRET" \
        "$API_URL/api/sync")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        log_info "Sync status: $body"
        return 0
    else
        log_error "Failed to get sync status (HTTP $http_code): $body"
        return 1
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  auto-sync     Perform automatic sync for all platforms"
    echo "  sync-all      Sync all platforms individually"
    echo "  sync-winget   Sync Windows packages"
    echo "  sync-homebrew Sync macOS packages"
    echo "  sync-fedora   Sync Fedora packages"
    echo "  sync-arch     Sync Arch Linux packages"
    echo "  status        Get current sync status"
    echo ""
    echo "Environment variables:"
    echo "  API_URL           API base URL (default: http://localhost:3002)"
    echo "  SYNC_SECRET_KEY   Secret key for sync authorization"
    echo "  LOG_FILE          Log file path (default: /var/log/repohub-sync.log)"
    echo ""
    echo "Examples:"
    echo "  $0 auto-sync                    # Auto sync all platforms"
    echo "  $0 sync-winget                  # Sync only Windows packages"
    echo "  API_URL=https://api.repohub.com $0 status  # Check status on production"
}

# Main script logic
main() {
    # Create log file if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    log_info "RepoHub Server Sync Script started"
    
    check_env
    
    case "${1:-}" in
        "auto-sync")
            auto_sync
            ;;
        "sync-all")
            log_info "Syncing all platforms individually"
            sync_platform "winget"
            sync_platform "homebrew"
            sync_platform "fedora"
            sync_platform "arch"
            ;;
        "sync-winget")
            sync_platform "winget"
            ;;
        "sync-homebrew")
            sync_platform "homebrew"
            ;;
        "sync-fedora")
            sync_platform "fedora"
            ;;
        "sync-arch")
            sync_platform "arch"
            ;;
        "status")
            get_status
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            log_error "Unknown command: ${1:-}"
            show_usage
            exit 1
            ;;
    esac
    
    log_info "RepoHub Server Sync Script completed"
}

# Run main function with all arguments
main "$@"
