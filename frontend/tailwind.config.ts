import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(214 20% 88%)",
        background: "hsl(210 20% 98%)",
        foreground: "hsl(218 28% 14%)",
        muted: "hsl(215 16% 46%)",
        panel: "hsl(0 0% 100%)",
        primary: "hsl(199 89% 36%)",
        success: "hsl(151 65% 34%)",
        warning: "hsl(38 92% 44%)",
        critical: "hsl(0 72% 48%)"
      },
      boxShadow: {
        panel: "0 1px 2px hsl(218 28% 14% / 0.06)"
      }
    }
  },
  plugins: []
} satisfies Config;
