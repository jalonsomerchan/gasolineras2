window.GasApp = window.GasApp || {};
window.GasApp.dom = {
  el: function(tag, options) {
    options = options || {};
    var node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.html !== undefined) node.innerHTML = options.html;
    Object.entries(options.attrs || {}).forEach(function(pair) { if (pair[1] !== null && pair[1] !== undefined && pair[1] !== false) node.setAttribute(pair[0], pair[1] === true ? '' : pair[1]); });
    Object.entries(options.events || {}).forEach(function(pair) { node.addEventListener(pair[0], pair[1]); });
    (options.children || []).forEach(function(child) { if (child !== null && child !== undefined) node.append(child instanceof Node ? child : document.createTextNode(String(child))); });
    return node;
  },
  clear: function(node) { while (node.firstChild) node.removeChild(node.firstChild); },
  status: function(message, type) { return window.GasApp.dom.el('div', { className: type || 'loading', text: message }); },
  debounce: function(fn, delay) { var timer; return function() { var args = arguments; clearTimeout(timer); timer = setTimeout(function() { fn.apply(null, args); }, delay || 250); }; }
};
