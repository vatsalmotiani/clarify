"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// Import all translation files
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";
import mr from "@/locales/mr.json";
import pa from "@/locales/pa.json";
import gu from "@/locales/gu.json";
import sd from "@/locales/sd.json";
import ur from "@/locales/ur.json";
import ml from "@/locales/ml.json";
import ta from "@/locales/ta.json";
import te from "@/locales/te.json";

export type LanguageCode = "en" | "hi" | "mr" | "pa" | "gu" | "sd" | "ur" | "ml" | "ta" | "te";

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", direction: "ltr" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", direction: "ltr" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", direction: "ltr" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", direction: "ltr" },
  { code: "sd", name: "Sindhi", nativeName: "سنڌي", direction: "rtl" },
  { code: "ur", name: "Urdu", nativeName: "اردو", direction: "rtl" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", direction: "ltr" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", direction: "ltr" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", direction: "ltr" },
];

const translations: Record<LanguageCode, typeof en> = {
  en,
  hi,
  mr,
  pa,
  gu,
  sd,
  ur,
  ml,
  ta,
  te,
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  direction: "ltr" | "rtl";
  isLocked: boolean;
  lockLanguage: () => void;
  unlockLanguage: () => void;
  currentLanguage: Language;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "clarify-language";
const LANGUAGE_LOCKED_KEY = "clarify-language-locked";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");
  const [isLocked, setIsLocked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
    const savedLocked = localStorage.getItem(LANGUAGE_LOCKED_KEY);

    if (savedLanguage && SUPPORTED_LANGUAGES.some(l => l.code === savedLanguage)) {
      setLanguageState(savedLanguage);
    }

    if (savedLocked === "true") {
      setIsLocked(true);
    }

    setIsInitialized(true);
  }, []);

  // Save language preference to localStorage
  const setLanguage = useCallback((lang: LanguageCode) => {
    if (isLocked) return; // Don't allow changing if locked

    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }, [isLocked]);

  // Lock the language (called after document upload)
  const lockLanguage = useCallback(() => {
    setIsLocked(true);
    localStorage.setItem(LANGUAGE_LOCKED_KEY, "true");
  }, []);

  // Unlock the language (called when returning to home page)
  const unlockLanguage = useCallback(() => {
    setIsLocked(false);
    localStorage.removeItem(LANGUAGE_LOCKED_KEY);
  }, []);

  // Translation function with nested key support and parameter interpolation
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split(".");
    let value: unknown = translations[language];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        // Fallback to English if key not found
        value = translations.en;
        for (const ek of keys) {
          if (value && typeof value === "object" && ek in value) {
            value = (value as Record<string, unknown>)[ek];
          } else {
            return key; // Return key if not found in English either
          }
        }
        break;
      }
    }

    if (typeof value !== "string") {
      return key;
    }

    // Replace parameters
    if (params) {
      let result = value;
      for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
      }
      return result;
    }

    return value;
  }, [language]);

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
  const direction = currentLanguage.direction;

  // Update document direction
  useEffect(() => {
    if (isInitialized) {
      document.documentElement.dir = direction;
      document.documentElement.lang = language;
    }
  }, [direction, language, isInitialized]);

  if (!isInitialized) {
    return null; // Prevent hydration mismatch
  }

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      t,
      direction,
      isLocked,
      lockLanguage,
      unlockLanguage,
      currentLanguage
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Helper to get language name for API calls
export function getLanguageName(code: LanguageCode): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang?.name || "English";
}
