"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Shield, Target, Languages, Sparkles } from "lucide-react";
import { FileDropzone } from "@/components/features/file-dropzone";
import { LanguageSelector } from "@/components/features/language-selector";
import { uploadDocuments, startAnalysis } from "@/lib/api";
import { useAnalysisStore } from "@/stores/analysis-store";
import { useLanguage, getLanguageName } from "@/context/LanguageContext";

export default function Home() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAnalysisId, setUploadedFiles, setStatus } = useAnalysisStore();
  const { t, lockLanguage, unlockLanguage, language } = useLanguage();

  // Unlock language when returning to home page
  useEffect(() => {
    unlockLanguage();
  }, [unlockLanguage]);

  const handleFilesSelected = async (files: File[]) => {
    setIsUploading(true);
    setError(null);

    // Lock the language once upload starts
    lockLanguage();

    try {
      setStatus("uploading", 10, t("upload.uploadingDocs"));
      // Pass full language name to backend for LLM outputs
      const languageName = getLanguageName(language);
      const response = await uploadDocuments(files, languageName);

      if (!response.analysis_id) {
        throw new Error("Failed to get analysis ID from server");
      }

      setAnalysisId(response.analysis_id);
      setUploadedFiles(response.files);

      setStatus("processing", 20, t("upload.startingProcessing"));
      await startAnalysis(response.analysis_id, languageName);

      router.push(`/analysis/${response.analysis_id}`);
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err instanceof Error
          ? err.message
          : t("upload.uploadError")
      );
      setIsUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.jpg"
              alt="Clarify"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-lg font-bold text-[#1E3A5F] flex items-center gap-1">
              {t("common.clarify")}
              <Sparkles className="w-4 h-4 text-primary" />
            </span>
          </div>
          <LanguageSelector />
        </div>
      </header>

      {/* Hero section */}
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          <p className="text-sm font-medium text-primary mb-2">{t("home.title")}</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-[#1E3A5F]">
            {t("home.tagline")}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t("home.subtitle")}
          </p>
        </motion.div>

        {/* Upload area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-xl mx-auto mb-12"
        >
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            disabled={isUploading}
            maxFiles={5}
            maxSizeMB={20}
          />

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-destructive mt-4 text-sm"
            >
              {error}
            </motion.p>
          )}
        </motion.div>

        {/* Three features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto"
        >
          <div className="flex items-start gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t("home.featureLoopholes")}</h3>
              <p className="text-sm text-muted-foreground">{t("home.featureLoopholesDesc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t("home.featureShield")}</h3>
              <p className="text-sm text-muted-foreground">{t("home.featureShieldDesc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Languages className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t("home.featureMultilingual")}</h3>
              <p className="text-sm text-muted-foreground">{t("home.featureMultilingualDesc")}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
          <p>{t("home.footer")}</p>
        </div>
      </footer>
    </main>
  );
}
