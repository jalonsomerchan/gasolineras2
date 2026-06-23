window.GasApp = window.GasApp || {};
window.GasApp.preferences = {
  get: function() { return localStorage.getItem('gasolineras:fuel') || window.GasApp.constants.DEFAULT_FUEL; },
  set: function(fuelId) { localStorage.setItem('gasolineras:fuel', fuelId); location.reload(); return fuelId; }
};
