#!/bin/bash

# Cron job setup script for RepoHub auto-sync
# This script sets up automatic sync using cron jobs

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC_SCRIPT="$SCRIPT_DIR/server-sync.sh"
CRON_FILE="/etc/cron.d/repohub-sync"
LOG_FILE="/var/log/repohub-sync.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root to setup cron jobs"
        echo "Please run: sudo $0"
        exit 1
    fi
}

# Check if sync script exists
check_sync_script() {
    if [ ! -f "$SYNC_SCRIPT" ]; then
        log_error "Sync script not found: $SYNC_SCRIPT"
        exit 1
    fi
    
    # Make sure sync script is executable
    chmod +x "$SYNC_SCRIPT"
    log_info "Sync script is ready: $SYNC_SCRIPT"
}

# Get sync frequency from environment or default to daily
get_sync_frequency() {
    local frequency="${AUTO_SYNC_DAYS:-1}"
    echo "$frequency"
}

# Setup cron job
setup_cron() {
    local frequency=$(get_sync_frequency)
    local cron_schedule="0 2 */$frequency * *"  # Run at 2 AM every N days
    
    log_info "Setting up cron job to run every $frequency day(s)"
    log_info "Cron schedule: $cron_schedule"
    
    # Create cron file
    cat > "$CRON_FILE" << EOF
# RepoHub Auto Sync - Runs every $frequency day(s) at 2 AM
# Environment variables
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
API_URL=${API_URL:-http://localhost:3002}
SYNC_SECRET_KEY=$SYNC_SECRET_KEY
AUTO_SYNC_DAYS=$frequency

# Cron job
$cron_schedule root $SYNC_SCRIPT auto-sync >> $LOG_FILE 2>&1

# Manual sync status check (every hour)
0 * * * * root $SYNC_SCRIPT status >> $LOG_FILE 2>&1
EOF
    
    # Set proper permissions
    chmod 644 "$CRON_FILE"
    
    # Reload cron service
    if command -v systemctl >/dev/null 2>&1; then
        systemctl reload cron || systemctl reload crond || true
    elif command -v service >/dev/null 2>&1; then
        service cron reload || service crond reload || true
    fi
    
    log_info "Cron job installed successfully: $CRON_FILE"
}

# Remove cron job
remove_cron() {
    if [ -f "$CRON_FILE" ]; then
        rm -f "$CRON_FILE"
        log_info "Cron job removed: $CRON_FILE"
        
        # Reload cron service
        if command -v systemctl >/dev/null 2>&1; then
            systemctl reload cron || systemctl reload crond || true
        elif command -v service >/dev/null 2>&1; then
            service cron reload || service crond reload || true
        fi
    else
        log_warn "No cron job found to remove"
    fi
}

# Show cron status
show_status() {
    if [ -f "$CRON_FILE" ]; then
        log_info "Cron job is installed:"
        cat "$CRON_FILE"
    else
        log_warn "No cron job found"
    fi
    
    if [ -f "$LOG_FILE" ]; then
        log_info "Recent sync logs:"
        tail -20 "$LOG_FILE"
    else
        log_warn "No log file found: $LOG_FILE"
    fi
}

# Test sync script
test_sync() {
    log_info "Testing sync script..."
    
    if [ -z "$SYNC_SECRET_KEY" ]; then
        log_error "SYNC_SECRET_KEY environment variable is required for testing"
        exit 1
    fi
    
    # Run a status check to test connectivity
    "$SYNC_SCRIPT" status
}

# Show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  install     Install cron job for auto-sync"
    echo "  remove      Remove cron job"
    echo "  status      Show cron job status and recent logs"
    echo "  test        Test sync script connectivity"
    echo "  help        Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  API_URL           API base URL (default: http://localhost:3002)"
    echo "  SYNC_SECRET_KEY   Secret key for sync authorization"
    echo "  AUTO_SYNC_DAYS    Sync frequency in days (default: 1)"
    echo "  LOG_FILE          Log file path (default: /var/log/repohub-sync.log)"
    echo ""
    echo "Examples:"
    echo "  $0 install                           # Install daily cron job"
    echo "  AUTO_SYNC_DAYS=7 $0 install          # Install weekly cron job"
    echo "  $0 status                            # Check cron job status"
    echo "  $0 test                              # Test sync script"
}

# Main script logic
main() {
    case "${1:-}" in
        "install")
            check_root
            check_sync_script
            setup_cron
            ;;
        "remove")
            check_root
            remove_cron
            ;;
        "status")
            show_status
            ;;
        "test")
            check_sync_script
            test_sync
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
}

# Run main function
main "$@"
