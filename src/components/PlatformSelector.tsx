"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api/client'
import { useLocale } from '@/contexts/LocaleContext'
import { Platform } from '@/types'

interface PlatformSelectorProps {
  selectedPlatform: Platform | null
  onPlatformSelect: (platform: Platform) => void
}

export function PlatformSelector({ selectedPlatform, onPlatformSelect }: PlatformSelectorProps) {
  const { t } = useLocale()
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  
  const iconSlug: Record<string, string> = {
    debian: 'debian',
    ubuntu: 'ubuntu',
    fedora: 'fedora',
    arch: 'archlinux',
    windows: 'windows',
    macos: 'apple'
  }
  const iconBase = (slug: string) => `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg`

  useEffect(() => {
    const loadPlatforms = async () => {
      try {
        const platformsData = await apiClient.getPlatforms()
        setPlatforms(platformsData)
      } catch (error) {
        console.error('Failed to load platforms:', error)
        // Fallback to mock data if API fails
        const { platforms: mockPlatforms } = await import('@/data/mockData')
        setPlatforms(mockPlatforms)
      } finally {
        setLoading(false)
      }
    }

    loadPlatforms()
  }, [])

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('platform.select')}</CardTitle>
          <CardDescription className="text-sm">
            {t('platform.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-8 text-muted-foreground">
            Loading platforms...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t('platform.select')}</CardTitle>
        <CardDescription className="text-sm">
          {t('platform.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {platforms.map((platform) => (
            <Button
              key={platform.id}
              variant="outline"
              className={`h-12 px-2 py-1 flex flex-col items-center justify-center gap-1 rounded-md border transition-colors
                ${selectedPlatform?.id === platform.id 
                  ? 'border-primary ring-2 ring-primary/60 bg-primary/5' 
                  : 'border-border hover:bg-secondary/60'}`}
              onClick={() => onPlatformSelect(platform)}
            >
              <div
                className={`h-5 w-5 ${selectedPlatform?.id === platform.id ? 'text-foreground' : 'text-muted-foreground'}`}
                style={{
                  WebkitMaskImage: `url(${iconBase(iconSlug[platform.id] || 'linux')})`,
                  maskImage: `url(${iconBase(iconSlug[platform.id] || 'linux')})`,
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  backgroundColor: 'currentColor'
                } as React.CSSProperties}
              />
              <div className="text-center">
                <div className="font-medium text-xs leading-tight truncate max-w-[90px]">{platform.name}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
