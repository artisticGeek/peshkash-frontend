import { defineConfig, presetUno, presetAttributify } from 'unocss';

export default defineConfig({
  shortcuts: {
    'btn': 'px-4 py-2 rounded bg-maroon text-white hover:bg-maroon-dark',
    'card': 'p-4 rounded shadow border border-golden',
    'section-title': 'text-xl font-bold text-maroon border-b border-golden pb-2 mb-4',
  },
  theme: {
    colors: {
      maroon: '#800000',
      'maroon-dark': '#4B0000',
      golden: '#D4AF37',
      cream: '#FFF8E7',
      gray: '#666',
    },
  },
  presets: [presetUno(), presetAttributify()],
});
