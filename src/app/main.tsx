import * as React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from '@/app/App';
import { AppProviders } from '@/app/providers';
import '@/styles/globals.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
