import { Platform } from 'react-native';

/**
 * Identidade visual da Duarte Barbearia: azul-marinho do logo,
 * letras em creme e o vermelho da fachada como destaque.
 */
export const colors = {
  primary: '#E9E4D8', // creme do logo: botões, ícones e destaques
  primaryDark: '#CFC8B8', // creme pressionado
  primaryLight: '#1F2944', // superfície em destaque (item pressionado, avatar)
  onPrimary: '#11182A', // texto sobre o creme
  onPrimaryMuted: '#4A5470',
  accent: '#B5382F', // vermelho da fachada
  background: '#0B1120',
  surface: '#141C33',
  text: '#F1EEE7',
  textMuted: '#98A0B8',
  border: '#263152',
  danger: '#E35D52',
  success: '#5CB98A',
  warning: '#E0A43A',
  whatsapp: '#25D366',
};

/** Títulos em serifa, como no letreiro e no logo. */
export const fonts = {
  titulo: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { sm: 8, md: 12, lg: 20 };
