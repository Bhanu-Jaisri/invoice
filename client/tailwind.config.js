/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        colors: {
            primary: '#0923b5', // Royal Blue
            secondary: '#061880', // Darker Blue
            dark: '#fac0f7',
            white: '#ffffff',
            black: '#000000',
            transparent: 'transparent',
            current: 'currentColor',
            red: {
                500: '#ef4444',
            },
            green: {
                500: '#22c55e',
                600: '#16a34a',
            },
            blue: {
                500: '#3b82f6',
                600: '#2563eb',
            },
            gray: {
                50: '#f9fafb',
                100: '#f3f4f6',
                200: '#e5e7eb',
                300: '#d1d5db',
                400: '#9ca3af',
                500: '#6b7280',
                600: '#4b5563',
                700: '#374151',
                800: '#1f2937',
                900: '#111827',
                950: '#030712',
            },
        },
    },
    plugins: [],
}
