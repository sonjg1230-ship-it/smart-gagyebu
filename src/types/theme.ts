export type ThemeId = 'indigo' | 'emerald' | 'rose' | 'amber' | 'ocean' | 'purple' | 'dark';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  primaryBg: string;
  primaryHover: string;
  accentText: string;
  badgeBg: string;
  dotColor: string;
  isDark: boolean;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  indigo: {
    id: 'indigo',
    name: '클래식 인디고',
    primaryBg: 'bg-indigo-600',
    primaryHover: 'hover:bg-indigo-700',
    accentText: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700',
    dotColor: 'bg-indigo-600',
    isDark: false,
  },
  emerald: {
    id: 'emerald',
    name: '포레스트 에메랄드',
    primaryBg: 'bg-emerald-600',
    primaryHover: 'hover:bg-emerald-700',
    accentText: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700',
    dotColor: 'bg-emerald-600',
    isDark: false,
  },
  rose: {
    id: 'rose',
    name: '로맨틱 선셋',
    primaryBg: 'bg-rose-600',
    primaryHover: 'hover:bg-rose-700',
    accentText: 'text-rose-600',
    badgeBg: 'bg-rose-50 text-rose-700',
    dotColor: 'bg-rose-600',
    isDark: false,
  },
  amber: {
    id: 'amber',
    name: '웜 선샤인',
    primaryBg: 'bg-amber-600',
    primaryHover: 'hover:bg-amber-700',
    accentText: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700',
    dotColor: 'bg-amber-600',
    isDark: false,
  },
  ocean: {
    id: 'ocean',
    name: '딥 오션',
    primaryBg: 'bg-sky-600',
    primaryHover: 'hover:bg-sky-700',
    accentText: 'text-sky-600',
    badgeBg: 'bg-sky-50 text-sky-700',
    dotColor: 'bg-sky-600',
    isDark: false,
  },
  purple: {
    id: 'purple',
    name: '미스틱 퍼플',
    primaryBg: 'bg-purple-600',
    primaryHover: 'hover:bg-purple-700',
    accentText: 'text-purple-600',
    badgeBg: 'bg-purple-50 text-purple-700',
    dotColor: 'bg-purple-600',
    isDark: false,
  },
  dark: {
    id: 'dark',
    name: '다크 미드나이트',
    primaryBg: 'bg-slate-800',
    primaryHover: 'hover:bg-slate-700',
    accentText: 'text-sky-400',
    badgeBg: 'bg-slate-800 text-sky-300 border border-slate-700',
    dotColor: 'bg-sky-400',
    isDark: true,
  },
};
