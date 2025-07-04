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
