"use client"

import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { useLocale } from '@/contexts/LocaleContext'
import { Sun, Moon, Monitor, Globe } from 'lucide-react'

export function Header() {
  const { theme, isDark, toggleTheme } = useTheme()
  const { locale, toggleLocale } = useLocale()

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />
      case 'dark':
        return <Moon className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return locale === 'tr' ? 'Aydınlık' : 'Light'
      case 'dark':
        return locale === 'tr' ? 'Karanlık' : 'Dark'
      default:
        return locale === 'tr' ? 'Sistem' : 'System'
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">RH</span>
          </div>
          <span className="hidden font-bold sm:inline-block">
            RepoHub
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="w-full justify-start"
          >
            {getThemeIcon()}
            <span className="ml-2 hidden sm:inline">
              {getThemeLabel()}
            </span>
          </Button>

          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLocale}
            className="w-full justify-start"
          >
            <Globe className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">
              {locale === 'tr' ? 'TR' : 'EN'}
            </span>
          </Button>
        </div>
      </div>
    </header>
  )
}
