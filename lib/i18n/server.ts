import el from './el.json'
import en from './en.json'

type Locale = 'el' | 'en'
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

export function tServer(key: string, locale: Locale = 'el'): string {
  return (
    getNestedValue(translations[locale], key) ??
    getNestedValue(translations['el'], key) ??
    key
  )
}
