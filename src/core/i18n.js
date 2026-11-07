import en from '../i18n/en.js';
import fr from '../i18n/fr.js';
import de from '../i18n/de.js';

export const LANGUAGES = [
  { code: 'en', label: 'English', locale: 'en-GB' },
  { code: 'fr', label: 'Français', locale: 'fr-FR' },
  { code: 'de', label: 'Deutsch', locale: 'de-DE' },
];
export const DEFAULT_LANGUAGE = 'en';

const DICTIONARIES = { en, fr, de };
let current = DEFAULT_LANGUAGE;

const lookup = (dict, key) => (Object.hasOwn(dict, key) ? dict[key] : undefined);

export const isLanguage = (code) => LANGUAGES.some((l) => l.code === code);
export const setLanguage = (code) => { if (isLanguage(code)) current = code; };
export const locale = () => LANGUAGES.find((l) => l.code === current).locale;

/* Unknown keys are returned as-is, so data values (names) can pass through. `{name}` placeholders are filled from `vars`. */
export function t(key, vars = {}) {
  if (!key) return '';
  const text = lookup(DICTIONARIES[current], key) ?? lookup(en, key) ?? key;
  return String(text).replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));
}
