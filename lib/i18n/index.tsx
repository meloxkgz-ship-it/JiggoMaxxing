/**
 * Minimal i18n: device-locale boot, AsyncStorage override, t(key) lookup,
 * useT() hook re-renders on language switch.
 */
import * as Localization from 'expo-localization';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { getJSON, setJSON } from '../storage';
import en from './en';
import de from './de';

export type Lang = 'en' | 'de';

const dicts: Record<Lang, any> = { en, de };
const STORE_KEY = 'lang';
const SUPPORTED: Lang[] = ['en', 'de'];

function lookup(dict: any, key: string): string | undefined {
  return key.split('.').reduce<any>((acc, k) => (acc == null ? acc : acc[k]), dict);
}

function fmt(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

const warnedMissing = new Set<string>();
export function tFor(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const v = lookup(dicts[lang], key);
  if (typeof v === 'string') return fmt(v, vars);
  // Fallback chain: en, then literal key.
  const enValue = lookup(dicts.en, key);
  if (typeof enValue === 'string') {
    if (__DEV__ && lang !== 'en' && !warnedMissing.has(`${lang}:${key}`)) {
      warnedMissing.add(`${lang}:${key}`);
      console.warn(`[i18n] missing ${lang} key: ${key} (falling back to en)`);
    }
    return fmt(enValue, vars);
  }
  if (__DEV__ && !warnedMissing.has(key)) {
    warnedMissing.add(key);
    console.warn(`[i18n] missing key in both langs: ${key}`);
  }
  return key;
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<Ctx>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
});

function detectInitial(): Lang {
  try {
    const locales = Localization.getLocales();
    const tag = locales[0]?.languageCode?.toLowerCase();
    if (tag === 'de') return 'de';
  } catch {}
  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitial());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await getJSON<Lang | null>(STORE_KEY, null);
      if (stored && SUPPORTED.includes(stored)) setLangState(stored);
      setHydrated(true);
    })();
  }, []);

  const setLang = useCallback(async (next: Lang) => {
    setLangState(next);
    await setJSON(STORE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => tFor(lang, key, vars),
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  // Render an ink-colored View during hydrate instead of `null` so the
  // splash → app handoff doesn't flash through a transparent/white frame.
  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: '#080808' }} />;
  }
  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useT() {
  return useContext(LanguageContext).t;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'de', label: 'German',  native: 'Deutsch' },
];
