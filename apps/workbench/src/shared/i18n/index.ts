import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { zh } from './zh'
import { en } from './en'

const savedLang = localStorage.getItem('workbench_lang') ?? 'zh'

void i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'zh',
  interpolation: {
    escapeValue: false,
  },
})

export function changeLanguage(lang: string): void {
  void i18n.changeLanguage(lang)
  localStorage.setItem('workbench_lang', lang)
}

export { i18n }
