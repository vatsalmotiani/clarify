"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Globe, Lock } from "lucide-react";
import { useLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export function LanguageSelector() {
  const { language, setLanguage, t, isLocked, currentLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter languages based on search query
  const filteredLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelectLanguage = (code: LanguageCode) => {
    if (!isLocked) {
      setLanguage(code);
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !isLocked && setIsOpen(!isOpen)}
        disabled={isLocked}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
          isLocked
            ? "bg-muted/50 border-muted cursor-not-allowed opacity-70"
            : "bg-background border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
        )}
        title={isLocked ? "Language is locked after document upload" : t("language.select")}
      >
        {isLocked ? (
          <Lock className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Globe className="w-4 h-4 text-primary" />
        )}
        <span className="text-sm font-medium">{currentLanguage.nativeName}</span>
        {!isLocked && (
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && !isLocked && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 bg-background border rounded-lg shadow-lg z-50 overflow-hidden"
          >
            {/* Search bar */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("language.search")}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-muted/30 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Language list */}
            <div className="max-h-64 overflow-y-auto py-1">
              {filteredLanguages.length > 0 ? (
                filteredLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2 text-sm transition-colors",
                      language === lang.code
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{lang.nativeName}</span>
                      <span className="text-xs text-muted-foreground">{lang.name}</span>
                    </div>
                    {language === lang.code && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                  No languages found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
