/**
 * useFormWithRetry — Hook for form submission with automatic retry
 * 
 * Handles:
 * - Validation before submit
 * - Auto-retry on transient failures
 * - Optimistic UI updates
 * - Error message display
 * - Loading state management
 * 
 * Usage:
 *   const { state, submit, error } = useFormWithRetry({
 *     onSubmit: async (data) => base44.entities.Job.create(data),
 *     validate: (data) => validateJobForm(data),
 *   });
 */

import { useState } from 'react';
import { withRetry } from '@/lib/withRetry';

export function useFormWithRetry(options = {}) {
  const {
    onSubmit,
    validate = () => null,
    onSuccess = () => {},
    onError = () => {},
    maxRetries = 2,
  } = options;

  const [state, setState] = useState({
    loading: false,
    error: null,
    retrying: false,
    retryCount: 0,
    success: false,
  });

  const submit = async (formData) => {
    // Clear previous error
    setState((s) => ({ ...s, error: null, success: false }));

    // Validate
    const validationError = validate(formData);
    if (validationError) {
      setState((s) => ({
        ...s,
        error: validationError,
      }));
      onError(validationError);
      return null;
    }

    // Submit with retry
    setState((s) => ({ ...s, loading: true, retrying: false, retryCount: 0 }));

    try {
      const result = await withRetry(
        () => onSubmit(formData),
        {
          maxRetries,
          delay: 1000,
          backoff: 2,
          onRetry: (attempt, error) => {
            console.warn(`[FormRetry] Attempt ${attempt}/${maxRetries + 1}:`, error?.message);
            setState((s) => ({
              ...s,
              retrying: true,
              retryCount: attempt,
              error: `Retrying (${attempt}/${maxRetries})...`,
            }));
          },
        }
      );

      setState((s) => ({
        ...s,
        loading: false,
        error: null,
        retrying: false,
        success: true,
      }));

      onSuccess(result);
      return result;
    } catch (error) {
      const errorMessage = error?.message || 'Failed to submit form. Please try again.';

      setState((s) => ({
        ...s,
        loading: false,
        error: errorMessage,
        retrying: false,
      }));

      onError(error);
      return null;
    }
  };

  const retry = () => {
    // Reset state for retry
    setState((s) => ({
      ...s,
      error: null,
      retrying: true,
    }));
  };

  return {
    state,
    submit,
    retry,
    isLoading: state.loading,
    error: state.error,
    success: state.success,
    isRetrying: state.retrying,
  };
}