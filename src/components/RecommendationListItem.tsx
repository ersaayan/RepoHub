import { Package as PackageIcon, Star, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecommendedPackage } from '@/types/recommendations'

interface RecommendationListItemProps {
    pkg: RecommendedPackage
    isSelected: boolean
    onToggle: (pkg: RecommendedPackage) => void
}

export function RecommendationListItem({ pkg, isSelected, onToggle }: RecommendationListItemProps) {
    return (
        <div
            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
                }`}
            onClick={() => onToggle(pkg)}
        >
            {/* Package Icon */}
            <PackageIcon className="h-6 w-6 text-primary flex-shrink-0" />

            {/* Package Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm truncate">{pkg.name}</h4>
                    {pkg.presetMatch && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-primary text-primary-foreground">
                            <Star className="h-2.5 w-2.5" />
                            Essential
                        </span>
                    )}
                    <span className="text-xs text-muted-foreground">{pkg.version}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{pkg.description}</p>
            </div>



            {/* Select Button */}
            <Button
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className="ml-2"
                onClick={(e) => {
                    e.stopPropagation()
                    onToggle(pkg)
                }}
            >
                {isSelected ? '✓' : '+'}
            </Button>
        </div>

    )
}
