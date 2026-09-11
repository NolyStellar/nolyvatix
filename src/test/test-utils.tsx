import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialStoreState?: Partial<ReturnType<typeof useAppStore.getState>>;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    queryClient = createTestQueryClient(),
    initialStoreState,
    ...renderOptions
  } = options;

  if (initialStoreState) {
    useAppStore.setState(initialStoreState as any);
  }

  function AllProviders({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return {
    user: userEvent.setup(),
    queryClient,
    ...render(ui, { wrapper: AllProviders, ...renderOptions }),
  };
}

export * from '@testing-library/react';
export { userEvent };
