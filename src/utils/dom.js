export function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value === false || value === null || value === undefined) return;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'html') node.innerHTML = value;
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  });
  append(node, children.flat(Infinity));
  return node;
}

export function append(parent, children) {
  children.forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return parent;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function loading(message = 'Cargando...') {
  return h('div', { class: 'loading', role: 'status' }, message);
}

export function errorBox(message) {
  return h('div', { class: 'error-box', role: 'alert' }, message);
}
