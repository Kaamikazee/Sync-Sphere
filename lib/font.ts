// app/fonts.ts (or lib/fonts.ts)

import { Orbitron, Playfair_Display, Indie_Flower, Fira_Code, Raleway, Press_Start_2P, Pacifico, Bebas_Neue, Rubik_Mono_One, Cinzel } from 'next/font/google';

export const orbitron = Orbitron({
  variable: '--font-orbitron',
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

export const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

export const indie = Indie_Flower({
  variable: '--font-indie',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

export const firaCode = Fira_Code({
  variable: '--font-fira',
  subsets: ['latin'],
  weight: ['500'],
  display: 'swap',
});

export const raleway = Raleway({
  variable: '--font-raleway',
  subsets: ['latin'],
  weight: ['600'],
  display: 'swap',
});

export const pressStart = Press_Start_2P({
  variable: '--font-press-start',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

export const pacifico = Pacifico({
  variable: '--font-pacifico',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

export const bebas = Bebas_Neue({
  variable: '--font-bebas',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

export const rubikMono = Rubik_Mono_One({
  variable: '--font-rubik',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

export const cinzel = Cinzel({
  variable: '--font-cinzel',
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});
