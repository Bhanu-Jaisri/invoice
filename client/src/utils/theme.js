export const THEMES = {
    blue: { name: 'Modern Blue', primary: '#0923b5', secondary: '#061880', dark: '#fac0f7', badgeClass: 'bg-blue-50 text-blue-700' },
    emerald: { name: 'Sleek Emerald', primary: '#059669', secondary: '#047857', dark: '#d1fae5', badgeClass: 'bg-emerald-50 text-emerald-700' },
    indigo: { name: 'Indigo Royale', primary: '#4f46e5', secondary: '#4338ca', dark: '#e0e7ff', badgeClass: 'bg-indigo-50 text-indigo-700' },
    crimson: { name: 'Crimson Velvet', primary: '#dc2626', secondary: '#b91c1c', dark: '#fee2e2', badgeClass: 'bg-red-50 text-red-700' },
    charcoal: { name: 'Charcoal Dark', primary: '#374151', secondary: '#1f2937', dark: '#f3f4f6', badgeClass: 'bg-gray-100 text-gray-700' },
    amber: { name: 'Warm Amber', primary: '#d97706', secondary: '#b45309', dark: '#fef3c7', badgeClass: 'bg-amber-50 text-amber-700' }
};

export const applyTheme = (themeName) => {
    const theme = THEMES[themeName] || THEMES.blue;
    document.documentElement.style.setProperty('--color-primary', theme.primary);
    document.documentElement.style.setProperty('--color-secondary', theme.secondary);
    document.documentElement.style.setProperty('--color-dark', theme.dark);
};
