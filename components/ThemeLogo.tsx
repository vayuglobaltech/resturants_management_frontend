"use client";

import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";

type LogoMode = "auto" | "light" | "dark";

interface ThemeLogoProps {
  alt?: string;
  className?: string;
  mode?: LogoMode;
  priority?: boolean;
  size?: number;
}

export function ThemeLogo({
  alt = "",
  className = "",
  mode = "auto",
  priority = false,
  size = 48,
}: ThemeLogoProps) {
  const { theme } = useTheme();
  const logoTheme = mode === "auto" ? theme : mode;

  return (
    <Image
      src={
        logoTheme === "dark"
          ? "/icons/dark_mode.png"
          : "/icons/light_mode.png"
      }
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
