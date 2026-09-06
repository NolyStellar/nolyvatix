import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept benign Vite HMR WebSocket connection rejections in the sandboxed preview environment
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = reason?.message || (typeof reason === 'string' ? reason : '');
    if (
      msg.includes('WebSocket closed without opened') ||
      msg.includes('failed to connect to websocket')
    ) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
