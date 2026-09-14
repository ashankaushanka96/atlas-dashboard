import { useCallback, useEffect, useRef, useState } from "react";
import { formatError } from "./homeUtils";

export default function useWidgetData(loader) {
  const mountedRef = useRef(true);
  const [state, setState] = useState({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reload = useCallback(async (fresh = false) => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const data = await loader({ fresh });
      if (!mountedRef.current) return;
      setState({
        loading: false,
        error: null,
        data,
      });
    } catch (error) {
      if (!mountedRef.current) return;
      setState({
        loading: false,
        error: formatError(error, "Failed to load widget"),
        data: null,
      });
    }
  }, [loader]);

  useEffect(() => {
    reload(false);
  }, [reload]);

  return { ...state, reload };
}
