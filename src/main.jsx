import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { registerServiceWorker } from './lib/register-sw.js';
// import { initBrowserConsoleLogger } from './lib/browserLogger.js';
import { onFieldInvalid } from './utils/formValidation.js';
import './styles/colors_and_type.css';
import './styles/styles.css';

document.documentElement.lang = 'en';
document.documentElement.setAttribute('translate', 'no');

// initBrowserConsoleLogger();
registerServiceWorker();

document.addEventListener('invalid', (e) => {
  const el = e.target;
  if (
    !(el instanceof HTMLInputElement)
    && !(el instanceof HTMLSelectElement)
    && !(el instanceof HTMLTextAreaElement)
  ) return;
  if (!el.willValidate) return;
  e.preventDefault();
  onFieldInvalid({ currentTarget: el, preventDefault: () => e.preventDefault() });
}, true);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
