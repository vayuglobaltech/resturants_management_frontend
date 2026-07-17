"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PagePlaceholderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function PagePlaceholder({
  title,
  description = "This page is under construction. We're working hard to bring you this feature soon.",
  icon,
  className,
}: PagePlaceholderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col items-center justify-center min-h-[60vh] text-center",
        className
      )}
    >
      {icon && <div className="text-6xl mb-6">{icon}</div>}
      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      <p className="text-muted-foreground max-w-md mt-3">{description}</p>
      <div className="mt-8 flex gap-2">
        <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse" />
        <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse delay-150" />
        <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse delay-300" />
      </div>
    </motion.div>
  );
}