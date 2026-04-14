/**
 * useAsync Hook
 * Generic hook for managing asynchronous operations
 * Handles loading, error, and data states
 */

import { useState, useEffect, useCallback } from "react";

const useAsync = (asyncFunction, immediate = true) => {
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Execute async function
   */
  const execute = useCallback(async () => {
    setStatus("pending");
    setData(null);
    setError(null);

    try {
      const response = await asyncFunction();
      setData(response);
      setStatus("success");
      return response;
    } catch (err) {
      setError(err);
      setStatus("error");
      throw err;
    }
  }, [asyncFunction]);

  /**
   * Auto-execute on mount if immediate is true
   */
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    execute,
    status,
    data,
    error,
    isLoading: status === "pending",
    isSuccess: status === "success",
    isError: status === "error"
  };
};

export default useAsync;
