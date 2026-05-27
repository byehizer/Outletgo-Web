import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AuthProvider } from './contexts/AuthContext.tsx';
import { AppRouter } from './router/AppRouter.tsx';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </StrictMode>,
);
