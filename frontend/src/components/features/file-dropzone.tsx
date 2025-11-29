"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, File, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
}

export function FileDropzone({
  onFilesSelected,
  maxFiles = 5,
  maxSizeMB = 20,
  acceptedTypes = ["application/pdf"],
  disabled = false,
}: FileDropzoneProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        setError(
          `Some files were rejected. Only PDFs up to ${maxSizeMB}MB are allowed.`
        );
        return;
      }

      const newFiles = [...selectedFiles, ...acceptedFiles].slice(0, maxFiles);

      if (selectedFiles.length + acceptedFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed.`);
      }

      setSelectedFiles(newFiles);
    },
    [selectedFiles, maxFiles, maxSizeMB]
  );

  const removeFile = (index: number) => {
    setSelectedFiles((files) => files.filter((_, i) => i !== index));
    setError(null);
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxSize: maxSizeMB * 1024 * 1024,
    maxFiles: maxFiles - selectedFiles.length,
    disabled: disabled || selectedFiles.length >= maxFiles,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed",
          selectedFiles.length >= maxFiles && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <motion.div
            animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
            className={cn(
              "p-4 rounded-full",
              isDragActive ? "bg-primary/10" : "bg-muted"
            )}
          >
            <Upload
              className={cn(
                "w-8 h-8",
                isDragActive ? "text-primary" : "text-muted-foreground"
              )}
            />
          </motion.div>
          <div>
            <p className="text-lg font-medium">
              {isDragActive
                ? "Drop your documents here"
                : "Drag & drop your documents"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse (PDF only, max {maxSizeMB}MB each)
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Up to {maxFiles} files allowed
          </p>
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected files list */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {selectedFiles.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <File className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium truncate max-w-[300px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-background rounded-md transition-colors"
                  disabled={disabled}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload button */}
      {selectedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center"
        >
          <Button
            onClick={handleUpload}
            disabled={disabled}
            size="lg"
            className="w-full max-w-xs"
          >
            Clarify
          </Button>
        </motion.div>
      )}
    </div>
  );
}
