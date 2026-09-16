import { BoxColor } from '@/types';

/**
 * The cofrinho palette. Fixed hex values rather than theme tokens so a pot
 * keeps its identity in both themes — "o roxo é a viagem" has to hold in
 * dark mode too. `soft` is the tinted background behind the icon.
 */
export const BOX_PALETTE: Record<BoxColor, { label: string; main: string; soft: string }> = {
  sage: { label: 'Verde', main: '#4F7942', soft: 'rgba(79, 121, 66, 0.16)' },
  blue: { label: 'Azul', main: '#1E88E5', soft: 'rgba(30, 136, 229, 0.16)' },
  amber: { label: 'Âmbar', main: '#E8960C', soft: 'rgba(232, 150, 12, 0.18)' },
  rose: { label: 'Rosa', main: '#E11D74', soft: 'rgba(225, 29, 116, 0.16)' },
  violet: { label: 'Roxo', main: '#7E57C2', soft: 'rgba(126, 87, 194, 0.16)' },
  teal: { label: 'Turquesa', main: '#0F9D8A', soft: 'rgba(15, 157, 138, 0.16)' },
};
