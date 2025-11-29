"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Loader2, ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestOTP, verifyOTP } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AuthStep = "choice" | "email" | "otp";

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { login, startGuestMode } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<AuthStep>("choice");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(10);

  const handleClose = () => {
    setStep("choice");
    setEmail("");
    setOtp("");
    setError(null);
    onClose();
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestOTP(email);
      setExpiresIn(response.expires_in_minutes);
      setStep("otp");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await verifyOTP(email, otp);
      login(response.user);
      handleClose();
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestMode = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await startGuestMode();
      handleClose();
      onSuccess?.();
    } catch (err: any) {
      setError("Failed to start guest mode");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-background rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">
          {step === "choice" && (
            <motion.div
              key="choice"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">{t("auth.welcome")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("auth.chooseOption")}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => setStep("email")}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Mail className="w-4 h-4" />
                  {t("auth.signInWithEmail")}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t("auth.or")}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleGuestMode}
                  variant="outline"
                  className="w-full gap-2"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  {t("auth.continueAsGuest")}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                {t("auth.guestNote")}
              </p>
            </motion.div>
          )}

          {step === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button
                onClick={() => setStep("choice")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("common.back")}
              </button>

              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">{t("auth.enterEmail")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("auth.emailDescription")}
                </p>
              </div>

              <form onSubmit={handleRequestOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.emailLabel")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !email.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t("auth.sending")}
                    </>
                  ) : (
                    t("auth.sendCode")
                  )}
                </Button>
              </form>
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button
                onClick={() => setStep("email")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("common.back")}
              </button>

              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">{t("auth.enterCode")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("auth.codeSentTo")} <span className="font-medium">{email}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("auth.codeExpires", { minutes: String(expiresIn) })}
                </p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">{t("auth.codeLabel")}</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    disabled={isLoading}
                    autoFocus
                    className="text-center text-2xl tracking-widest"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t("auth.verifying")}
                    </>
                  ) : (
                    t("auth.verify")
                  )}
                </Button>

                <button
                  type="button"
                  onClick={handleRequestOTP}
                  className="w-full text-sm text-primary hover:underline"
                  disabled={isLoading}
                >
                  {t("auth.resendCode")}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
