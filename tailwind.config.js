// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
        futuristic: ["var(--font-orbitron)"],
        display: ["var(--font-playfair)"],
        handwriting: ["var(--font-indie)"],
        elegant: ["var(--font-raleway)"],
        retro: ["var(--font-press-start)"],
        signature: ["var(--font-pacifico)"],
        headline: ["var(--font-bebas)"],
        boldmono: ["var(--font-rubik)"],
        vintage: ["var(--font-cinzel)"],
        dancing: ["var(--font-dancing)"],
        caveat: ["var(--font-caveat)"],
        shadows: ["var(--font-shadows)"],
        vibes: ["var(--font-vibes)"],
        satisfy: ["var(--font-satisfy)"],
        architect: ["var(--font-architect)"],
        amatic: ["var(--font-amatic)"],
        just: ["var(--font-just)"],
      },
    },
  },
  plugins: [],
};
