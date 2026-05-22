'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import el from './el.json'
import en from './en.json'

export type Locale = 'el' | 'en'

type DeepRecord = { [key: string]: string | DeepRecord }
const translations: Record<Locale, DeepRecord> = { el, en }

function getNestedValue(obj: DeepRecord, key: string): string | undefined {
  const parts = key.split('.')
  let current: string | DeepRecord | undefined = obj
  for (const part of parts) {
    if (current === undefined || typeof current === 'string') return undefined
    current = (current as DeepRecord)[part]
  }
  return typeof current === 'string' ? current : undefined
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? `{{${key}}}`))
}

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  tu: (key: string, vars?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
  children,
  defaultLocale = 'el',
}: {
  children: React.ReactNode
  defaultLocale?: Locale
}) {
  const [locale, setLocale] = useState<Locale>(defaultLocale)

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value =
        getNestedValue(translations[locale], key) ??
        getNestedValue(translations['el'], key) ??
        key
      return interpolate(value, vars)
    },
    [locale]
  )

  const tu = useCallback(
    (key: string, vars?: Record<string, string | number>) => t(key, vars).toUpperCase(),
    [t]
  )

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, tu }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}

export function useT() {
  return useLocale().t
}

export function useTu() {
  return useLocale().tu
}
