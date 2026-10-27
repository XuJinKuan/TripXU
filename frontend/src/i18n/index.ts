import { createI18n } from 'vue-i18n'
import { DEFAULT_LOCALE, messages, type AppLocale } from './messages'

export type { AppLocale } from './messages'

const LOCALE_STORAGE_KEY = 'tripxu-locale'

// 产品仅提供中文版：始终使用默认语言（zh-CN），不再读取 localStorage / 浏览器语言
const resolveInitialLocale = (): AppLocale => DEFAULT_LOCALE

export const i18n = createI18n({
  legacy: false,
  locale: resolveInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  globalInjection: true,
  messages,
})

export const setAppLocale = (locale: AppLocale) => {
  i18n.global.locale.value = locale

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    document.documentElement.lang = locale
  }
}

export const getCurrentLocale = (): AppLocale => i18n.global.locale.value as AppLocale

if (typeof window !== 'undefined') {
  document.documentElement.lang = getCurrentLocale()
}
