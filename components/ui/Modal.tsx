"use client";

import { ReactNode, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  icon?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  variant?: "default" | "danger";
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  confirmText,
  cancelText,
  onConfirm,
  variant = "default",
  children,
  size = "md",
}: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  const confirmVariant =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 shadow-[0_4px_16px_rgba(239,68,68,0.3)]"
      : "bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_16px_rgba(99,102,241,0.3)]";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "relative w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden transition-colors duration-205",
                sizeClasses[size]
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Content */}
              <div className="p-6">
                {icon && (
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
                      {icon}
                    </div>
                  </div>
                )}
                {title && (
                  <h2 className="text-xl font-bold text-foreground text-center">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-muted-foreground text-sm mt-1 text-center">
                    {description}
                  </p>
                )}
                {children && <div className="mt-4">{children}</div>}
              </div>

              {/* Actions */}
              {(confirmText || cancelText) && (
                <div className="flex gap-3 p-6 pt-0">
                  {cancelText && (
                    <Button
                      variant="secondary"
                      onClick={onClose}
                      className="flex-1 py-2.5"
                    >
                      {cancelText}
                    </Button>
                  )}
                  {confirmText && (
                    <Button
                      onClick={onConfirm}
                      className={cn("flex-1 py-2.5 text-foreground", confirmVariant)}
                    >
                      {confirmText}
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}