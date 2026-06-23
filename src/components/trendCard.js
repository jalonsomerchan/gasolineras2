import { FuelStore } from '../state/fuelStore.js';
import { HistoricalChart } from './historicalChart.js';

export function TrendCard(rows = []) {
  const fuel = FuelStore.current();
  return HistoricalChart(rows, {
    title: `Histórico ${fuel.label}`,
    subtitle: 'Media de los últimos días',
    compact: true,
    limit: 7,
    ariaLabel: `Gráfico histórico de ${fuel.label}`
  });
}
