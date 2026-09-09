import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--app)",
        foreground: "var(--text)",
        app: "var(--app)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        line: "var(--line)",
        ink: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        good: "var(--good)",
        warn: "var(--warn)",
        crit: "var(--crit)",
        l1: "var(--l1)",
        l2: "var(--l2)",
        l3: "var(--l3)",
        wn: "var(--wn)",
        pe: "var(--pe)",
        ctl: "var(--ctl)",
        panel: "var(--panel)",
      },
      fontFamily: {
        title: ["var(--se-title)"],
        sans: ["var(--se-body)"],
        mono: ["var(--se-mono)"],
      },
      boxShadow: {
        panel: "var(--shadow)",
      },
      minHeight: {
        touch: "40px",
      },
    },
  },
  plugins: [],
};
export default config;
