/**
 * FleetTrack Mobile Theme
 * Dark mode with premium violet accent (matching web app)
 */

export const Colors = {
    // Primary palette
    primary: '#8b5cf6',
    primaryDark: '#7c3aed',
    primaryLight: '#a78bfa',
    primaryFaded: 'rgba(139, 92, 246, 0.15)',

    // Background
    background: '#0f172a',
    surface: '#1e293b',
    surfaceLight: '#334155',
    card: '#1e293b',
    cardBorder: 'rgba(139, 92, 246, 0.2)',

    // Text
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',

    // Status
    positive: '#10b981',
    positiveFaded: 'rgba(16, 185, 129, 0.15)',
    negative: '#ef4444',
    negativeFaded: 'rgba(239, 68, 68, 0.15)',
    warning: '#f59e0b',
    warningFaded: 'rgba(245, 158, 11, 0.15)',
    info: '#3b82f6',
    infoFaded: 'rgba(59, 130, 246, 0.15)',

    // Misc
    white: '#ffffff',
    black: '#000000',
    border: 'rgba(148, 163, 184, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    inputBg: 'rgba(15, 23, 42, 0.5)',
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const FontSize = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    title: 34,
};

export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
};

export const Shadows = {
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
};
