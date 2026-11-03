import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';

export const LANGS = ['en', 'de', 'fr'] as const;
export type Lang = (typeof LANGS)[number];
const STORAGE_KEY = 'tpb.lang';

/** Any language tag ('de-AT', 'fr', …) → a supported Lang, else undefined. */
export function toLang(tag: string | null | undefined): Lang | undefined {
  const base = tag?.toLowerCase().split('-')[0];
  return LANGS.find((l) => l === base);
}

function initialLanguage(): Lang {
  try {
    const saved = toLang(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch {
    /* storage unavailable */
  }
  return (typeof navigator !== 'undefined' && toLang(navigator.language)) || 'en';
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, de: { translation: de }, fr: { translation: fr } },
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage unavailable */
  }
  void i18n.changeLanguage(lang);
}

export function currentLanguage(): Lang {
  return toLang(i18n.language) ?? 'en';
}

export default i18n;
