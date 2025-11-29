"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  FileText,
  Clock,
  Trash2,
  LogOut,
  LogIn,
  User,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { getAnalysisHistory, deleteAnalysis } from "@/lib/api";
import type { AnalysisHistoryItem } from "@/types";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onSignInClick?: () => void;
}

export function Sidebar({ onSignInClick }: SidebarProps) {
  const router = useRouter();
  const { user, isGuest, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch history when sidebar opens and user is authenticated
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadHistory();
    }
  }, [isOpen, isAuthenticated]);

  const loadHistory = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const response = await getAnalysisHistory();
      setHistory(response.analyses || []);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalysisClick = (id: string) => {
    router.push(`/analysis/${id}`);
    setIsOpen(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnalysis(id);
      setHistory((prev) => prev.filter((a) => a.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete analysis:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
    setHistory([]);
    setIsOpen(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-500";
    return "text-red-600";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t("sidebar.history")}
            </SheetTitle>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isAuthenticated ? (
              <>
                {/* User info */}
                <div className="p-4 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user?.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {history.length} {history.length === 1 ? "analysis" : "analyses"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* History list */}
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading...
                  </div>
                ) : history.length > 0 ? (
                  <div className="divide-y">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="relative group"
                      >
                        <button
                          onClick={() => handleAnalysisClick(item.id)}
                          className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <FileText className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {item.document_names?.[0] || "Untitled"}
                              </p>
                              {item.document_names?.length > 1 && (
                                <p className="text-xs text-muted-foreground">
                                  +{item.document_names.length - 1} more
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(item.created_at)}
                                </span>
                                {item.overall_score > 0 && (
                                  <>
                                    <span className="text-muted-foreground">·</span>
                                    <span className={cn("text-xs font-medium", getScoreColor(item.overall_score))}>
                                      {Math.round(item.overall_score / 10)}/10
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>

                        {/* Delete button */}
                        <AnimatePresence>
                          {deleteConfirm === item.id ? (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-background/95 flex items-center justify-center gap-2 p-2"
                            >
                              <span className="text-xs text-muted-foreground">
                                {t("sidebar.confirmDelete")}
                              </span>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(item.id)}
                              >
                                {t("sidebar.delete")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteConfirm(null)}
                              >
                                Cancel
                              </Button>
                            </motion.div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(item.id)}
                              className="absolute top-4 right-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="font-medium text-muted-foreground">
                      {t("sidebar.noHistory")}
                    </p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      {t("sidebar.noHistoryDesc")}
                    </p>
                  </div>
                )}
              </>
            ) : isGuest ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="font-medium mb-2">{t("sidebar.guestMode")}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("sidebar.guestModeDesc")}
                </p>
                <Button onClick={() => { setIsOpen(false); onSignInClick?.(); }} className="gap-2">
                  <LogIn className="w-4 h-4" />
                  {t("auth.signIn")}
                </Button>
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">{t("auth.welcome")}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("auth.chooseOption")}
                </p>
                <Button onClick={() => { setIsOpen(false); onSignInClick?.(); }} className="gap-2">
                  <LogIn className="w-4 h-4" />
                  {t("auth.signIn")}
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          {isAuthenticated && (
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                {t("auth.signOut")}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
