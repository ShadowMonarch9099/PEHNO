/** PEHNO colour slug → display hex, for swatches. */
export const COLOR_HEX: Record<string, string> = {
  red: '#D0342C',
  maroon: '#7B1E2B',
  pink: '#E75480',
  orange: '#FF7F11',
  yellow: '#F2C230',
  golden: '#C9A227',
  green: '#2E8B57',
  teal: '#0E7C7B',
  blue: '#3B6FD6',
  navy: '#1F2F6B',
  purple: '#6A3FA0',
  white: '#F8F8F8',
  cream: '#F3E9D2',
  beige: '#D9C3A5',
  grey: '#8E8E8E',
  black: '#1E1B15',
  brown: '#7A4E2D',
  multicolor: '#B565A7',
};
export const hexFor = (slug: string) => COLOR_HEX[slug] ?? '#CCCCCC';
