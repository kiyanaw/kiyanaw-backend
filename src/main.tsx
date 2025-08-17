import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { DataStore, AuthModeStrategyType } from '@aws-amplify/datastore';
import { ThemeProvider } from '@aws-amplify/ui-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@aws-amplify/ui-react/styles.css';
import awsExports from './aws-exports';
import './index.css';
import App from './App.tsx';

// PWA service worker is handled by vite-plugin-pwa in production builds

// Simple domain detection and redirect
const currentDomain = window.location.hostname;
const currentPath = window.location.pathname;
const currentSearch = window.location.search;
const currentHash = window.location.hash;

// Redirect transcribe.kiyanaw.* to bundle.kiyanaw.*
if (currentDomain.startsWith('transcribe.kiyanaw')) {
  const newDomain = currentDomain.replace('transcribe.kiyanaw', 'bundle.kiyanaw');
  const newUrl = `${window.location.protocol}//${newDomain}${currentPath}${currentSearch}${currentHash}`;
  console.log('🔄 Redirecting to:', newUrl);
  window.location.href = newUrl;
}

// Configure Amplify
Amplify.configure(awsExports);

// Configure DataStore to use multiple authorization types based on the model's @auth rules
// This ensures that DataStore sync and subscriptions use the appropriate auth mode
// for each model, prioritizing User Pool auth over IAM for consistency
DataStore.configure({
  authModeStrategyType: AuthModeStrategyType.MULTI_AUTH
});

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode> 
);
