/**
 * Validate package names in recommendation presets against the database
 * 
 * Usage:
 *   tsx scripts/validate-presets.ts --all
 *   tsx scripts/validate-presets.ts windows macos
 *   tsx scripts/validate-presets.ts ubuntu
 */

import { PACKAGE_PRESETS } from '../src/data/recommendationPresets';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

// Platform IDs
const PLATFORMS = ['windows', 'macos', 'ubuntu', 'debian', 'arch', 'fedora'] as const;
type PlatformId = typeof PLATFORMS[number];

interface PackageCheckResult {
    exists: boolean;
    foundName?: string;
    similarMatches?: string[];
    error?: string;
}

async function checkPackageExists(
    platformId: string,
    packageName: string
): Promise<PackageCheckResult> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/packages?platform_id=${platformId}&search=${encodeURIComponent(packageName)}&limit=10`
        );

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Check for exact match (case-insensitive)
        const exactMatch = data.packages?.find(
            (pkg: any) => pkg.name.toLowerCase() === packageName.toLowerCase()
        );

        return {
            exists: !!exactMatch,
            foundName: exactMatch?.name || undefined,
            similarMatches: data.packages?.slice(0, 3).map((p: any) => p.name) || []
        };
    } catch (error: any) {
        console.error(`Error checking ${packageName} on ${platformId}:`, error.message);
        return { exists: false, error: error.message };
    }
}

async function validatePlatform(platformId: PlatformId) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Validating ${platformId.toUpperCase()}`);
    console.log('='.repeat(60));

    const platformPresets = PACKAGE_PRESETS[platformId];
    if (!platformPresets) {
        console.log(`❌ No presets found for platform: ${platformId}`);
        return { total: 0, found: 0, missing: [] as any[] };
    }

    const results = {
        total: 0,
        found: 0,
        missing: [] as { category: string; packageName: string; similar?: string[]; reason?: string }[]
    };

    // Check each category
    for (const [category, packages] of Object.entries(platformPresets)) {
        console.log(`\n📁 Category: ${category}`);

        for (const packageName of packages) {
            results.total++;

            const check = await checkPackageExists(platformId, packageName);

            if (check.error) {
                console.log(`  ⚠️  ${packageName} - Error: ${check.error}`);
                results.missing.push({ category, packageName, reason: 'API Error' });
            } else if (check.exists) {
                console.log(`  ✅ ${packageName}${check.foundName !== packageName ? ` (found as: ${check.foundName})` : ''}`);
                results.found++;
            } else {
                console.log(`  ❌ ${packageName} - NOT FOUND`);
                if (check.similarMatches && check.similarMatches.length > 0) {
                    console.log(`     Similar: ${check.similarMatches.join(', ')}`);
                }
                results.missing.push({
                    category,
                    packageName,
                    similar: check.similarMatches
                });
            }

            // Delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return results;
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage:');
        console.log('  tsx scripts/validate-presets.ts --all');
        console.log('  tsx scripts/validate-presets.ts windows macos ubuntu');
        console.log('\nAvailable platforms:', PLATFORMS.join(', '));
        process.exit(1);
    }

    let platformsToCheck: PlatformId[] = [];

    if (args.includes('--all')) {
        platformsToCheck = [...PLATFORMS];
    } else {
        // Validate platform names
        for (const platform of args) {
            if (!PLATFORMS.includes(platform as any)) {
                console.error(`❌ Invalid platform: ${platform}`);
                console.log('Available platforms:', PLATFORMS.join(', '));
                process.exit(1);
            }
        }
        platformsToCheck = args as PlatformId[];
    }

    console.log(`\n🔍 Validating package presets for: ${platformsToCheck.join(', ')}\n`);

    const allResults: Record<string, any> = {};

    for (const platform of platformsToCheck) {
        const results = await validatePlatform(platform);
        allResults[platform] = results;
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('SUMMARY');
    console.log('='.repeat(60));

    let totalPackages = 0;
    let totalFound = 0;
    let totalMissing = 0;

    for (const [platform, results] of Object.entries(allResults)) {
        totalPackages += results.total;
        totalFound += results.found;
        totalMissing += results.missing.length;

        const successRate = results.total > 0
            ? ((results.found / results.total) * 100).toFixed(1)
            : '0';

        console.log(`\n${platform.toUpperCase()}:`);
        console.log(`  Total: ${results.total}`);
        console.log(`  Found: ${results.found} (${successRate}%)`);
        console.log(`  Missing: ${results.missing.length}`);

        if (results.missing.length > 0) {
            console.log(`  Missing packages:`);
            for (const { category, packageName, similar } of results.missing) {
                console.log(`    - ${packageName} (${category})`);
                if (similar && similar.length > 0) {
                    console.log(`      Try: ${similar.join(', ')}`);
                }
            }
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`OVERALL: ${totalFound}/${totalPackages} packages found (${((totalFound / totalPackages) * 100).toFixed(1)}%)`);
    console.log('='.repeat(60));

    if (totalMissing > 0) {
        console.log(`\n⚠️  Found ${totalMissing} missing packages. Review the output above and update recommendationPresets.ts`);
        process.exit(1);
    } else {
        console.log('\n✅ All packages validated successfully!');
        process.exit(0);
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
