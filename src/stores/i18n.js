import { DEFAULT_LANGUAGE, LANGUAGES, isLanguage, setLanguage } from '../core/i18n.js';

const STORAGE_KEY = 'expenses.language';

/* Current interface language. The choice is remembered on this device; a signed-in user's saved language wins. */
export function createI18nStore(storage = globalThis.localStorage) {
  let saved = null;
  try { saved = storage?.getItem(STORAGE_KEY); } catch { /* storage unavailable: use the default */ }
  const lang = isLanguage(saved) ? saved : DEFAULT_LANGUAGE;
  setLanguage(lang);
  if (globalThis.document) document.documentElement.lang = lang;

  return {
    lang,
    languages: LANGUAGES,
    set(code) {
      if (!isLanguage(code)) return;
      this.lang = code;
      setLanguage(code);
      try { storage?.setItem(STORAGE_KEY, code); } catch { /* not persisted, still applied */ }
      if (globalThis.document) document.documentElement.lang = code;
    },
  };
}
