import { QueryClient } from '@tanstack/react-query';

// Optimized query client configuration for scale
export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 5 * 60 * 1000, // 5 minutes default
			gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
			refetchOnReconnect: false,
		},
		mutations: {
			retry: 1,
		},
	},
});