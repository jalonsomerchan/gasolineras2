window.GasApp = window.GasApp || {};
(function(){
  var KEY = 'gasolineras:favorites';
  function list() { try { var value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value.map(String) : []; } catch(e) { return []; } }
  window.GasApp.favorites = {
    list: list,
    has: function(id) { return list().includes(String(id)); },
    toggle: function(id) { id = String(id); var current = list(); var next = current.includes(id) ? current.filter(function(item){ return item !== id; }) : [id].concat(current); localStorage.setItem(KEY, JSON.stringify(next)); return next.includes(id); }
  };
})();
