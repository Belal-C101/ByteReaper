"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      themes={["light", "dark", "theme-ocean", "theme-forest", "theme-sunset"]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}