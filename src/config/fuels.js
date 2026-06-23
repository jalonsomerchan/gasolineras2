export const FUELS = [
  { id: 'gasolina_95', label: 'Gasolina 95', shortLabel: '95', priceField: 'media_gasolina_95', minField: 'min_gasolina_95', maxField: 'max_gasolina_95' },
  { id: 'gasoleo_a', label: 'Diésel', shortLabel: 'Diésel', priceField: 'media_gasoleo_a', minField: 'min_gasoleo_a', maxField: 'max_gasoleo_a' },
  { id: 'gasolina_98', label: 'Gasolina 98', shortLabel: '98', priceField: 'media_gasolina_98', minField: 'min_gasolina_98', maxField: 'max_gasolina_98' }
];

export function getFuel(id) {
  return FUELS.find((fuel) => fuel.id === id) || FUELS[0];
}
