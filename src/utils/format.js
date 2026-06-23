export function numberValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function price(value) {
  const parsed = numberValue(value);
  if (parsed === null || parsed <= 0) return '—';
  return `${parsed.toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €/L`;
}

export function shortPrice(value) {
  const parsed = numberValue(value);
  if (parsed === null || parsed <= 0) return '—';
  return parsed.toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export function distance(value) {
  const parsed = numberValue(value);
  if (parsed === null) return '';
  if (parsed < 1) return `${Math.round(parsed * 1000)} m`;
  return `${parsed.toLocaleString('es-ES', { maximumFractionDigits: 1 })} km`;
}

export function integer(value) {
  const parsed = numberValue(value);
  if (parsed === null) return '—';
  return parsed.toLocaleString('es-ES', { maximumFractionDigits: 0 });
}

export function dateText(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function stationName(station) {
  return station?.rotulo || station?.nombre || `Gasolinera ${station?.ideess || ''}`.trim();
}

export function routePart(value) {
  return encodeURIComponent(value || '');
}
