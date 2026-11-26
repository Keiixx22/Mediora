import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Core from './lib/core.js';
import App from './App.jsx';
import './index.css';

// Seed or load the data first so every page can read it synchronously.
Core.init().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
