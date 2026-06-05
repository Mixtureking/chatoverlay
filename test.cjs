const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!DOCTYPE html><div id='app'></div>`);
global.window = dom.window;
global.document = dom.window.document;
global.CustomEvent = dom.window.CustomEvent;
global.HTMLElement = dom.window.HTMLElement;

// Simulate the proxy and wrapper
const debouncedCustomJs = `
window.addEventListener('onChatUpdate', (e) => {
  const container = document.getElementById('custom-chat-box');
  if(container) {
    container.innerHTML = 'Messages: ' + e.detail.length;
    console.log('UPDATED CONTAINER:', container.innerHTML);
  } else {
    console.log('CONTAINER NOT FOUND');
  }
});
`;

const registeredListeners = [];
const sandboxAddEventListener = (type, listener, options) => {
  window.addEventListener(type, listener, options);
  registeredListeners.push({ target: window, type, listener, options });
};

const windowProxy = new Proxy(window, {
  get(target, prop) {
    if (prop === 'addEventListener') return sandboxAddEventListener;
    const val = target[prop];
    return typeof val === 'function' ? val.bind(target) : val;
  }
});

const documentProxy = new Proxy(document, {
  get(target, prop) {
    const val = target[prop];
    return typeof val === 'function' ? val.bind(target) : val;
  }
});

const wrapperFunc = new Function('window', 'document', 'addEventListener', 'setInterval', 'setTimeout', debouncedCustomJs);
wrapperFunc(windowProxy, documentProxy, sandboxAddEventListener, window.setInterval, window.setTimeout);

document.getElementById('app').innerHTML = `<div id="custom-chat-box"></div>`;

setTimeout(() => {
  const event = new CustomEvent('onChatUpdate', { detail: [1,2,3] });
  window.dispatchEvent(event);
}, 50);
