window.GasApp = window.GasApp || {};
window.GasApp.format = {
  fuel: function(id) { return window.GasApp.constants.FUEL_OPTIONS.find(function(fuel) { return fuel.id === id; }) || window.GasApp.constants.FUEL_OPTIONS[0]; },
  stationName: function(station) { station = station || {}; return station.rotulo || station.nombre || ('Gasolinera ' + (station.ideess || '')).trim(); },
  stationPrice: function(station, fuelId) { var option = window.GasApp.format.fuel(fuelId); var raw = station.precio || station[option.priceKey] || station['media_' + fuelId]; var price = Number(raw); return Number.isFinite(price) && price > 0 ? price : null; },
  price: function(value) { var n = Number(value); return Number.isFinite(n) && n > 0 ? n.toFixed(3).replace('.', ',') + ' €' : '—'; },
  distance: function(value) { var n = Number(value); if (!Number.isFinite(n)) return ''; return n < 1 ? Math.round(n * 1000) + ' m' : n.toFixed(1).replace('.', ',') + ' km'; },
  enc: function(value) { return encodeURIComponent(String(value || '').trim()); },
  dec: function(value) { return decodeURIComponent(String(value || '').replace(/\+/g, ' ')); },
  since: function(days) { var date = new Date(); date.setDate(date.getDate() - days); return date.toISOString().slice(0, 10); }
};
