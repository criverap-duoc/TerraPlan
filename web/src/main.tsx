import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@/styles/globals.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/App';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/features/auth/auth-context';
import { queryClient } from '@/lib/query-client';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
