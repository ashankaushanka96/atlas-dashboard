import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { API } from "../services/auth";

const SAVE_DEBOUNCE_MS = 600;

/**
 * Per-user, server-persisted column visibility + order for a data table.
 *
 * `defaultColumns` must be a referentially-stable array (define it as a
 * module-level constant, or a useMemo keyed on stable inputs, not a fresh
 * inline array every render) of `{ key, label, pinned?, hiddenByDefault? }`.
 * Pinned columns (e.g. "Actions") are always visible, always rendered last,
 * and are excluded from the chooser and from persistence entirely.
 * `hiddenByDefault` columns (e.g. fields only otherwise reachable via
 * Advanced Search) are listed in the chooser and can be toggled on, but
 * start unchecked and are excluded when resetting to default.
 */
export default function useTableColumns(tableKey, defaultColumns) {
  const pinnedColumns = useMemo(
    () => defaultColumns.filter((column) => column.pinned),
    [defaultColumns]
  );
  const columnByKey = useMemo(() => {
    const map = {};
    defaultColumns.forEach((column) => {
      map[column.key] = column;
    });
    return map;
  }, [defaultColumns]);
  const defaultKeyOrder = useMemo(
    () => defaultColumns.filter((column) => !column.pinned).map((column) => column.key),
    [defaultColumns]
  );
  const defaultVisibleKeyOrder = useMemo(
    () =>
      defaultColumns
        .filter((column) => !column.pinned && !column.hiddenByDefault)
        .map((column) => column.key),
    [defaultColumns]
  );

  const [orderedKeys, setOrderedKeys] = useState(defaultKeyOrder);
  const [visibleKeySet, setVisibleKeySet] = useState(() => new Set(defaultVisibleKeyOrder));
  const [loading, setLoading] = useState(true);

  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    API.get(`/table-preferences/${tableKey}`)
      .then((response) => {
        if (cancelled) return;
        const saved = response.data?.columns;

        if (Array.isArray(saved) && saved.length) {
          const knownSaved = saved.filter((key) => defaultKeyOrder.includes(key));
          const missing = defaultKeyOrder.filter((key) => !knownSaved.includes(key));
          setOrderedKeys([...knownSaved, ...missing]);
          setVisibleKeySet(new Set(knownSaved));
        } else {
          setOrderedKeys(defaultKeyOrder);
          setVisibleKeySet(new Set(defaultVisibleKeyOrder));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOrderedKeys(defaultKeyOrder);
          setVisibleKeySet(new Set(defaultVisibleKeyOrder));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tableKey, defaultKeyOrder, defaultVisibleKeyOrder]);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    },
    []
  );

  const persist = useCallback(
    (nextOrderedKeys, nextVisibleSet) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const visibleOrder = nextOrderedKeys.filter((key) => nextVisibleSet.has(key));
        API.put(`/table-preferences/${tableKey}`, { columns: visibleOrder }).catch(() => {});
      }, SAVE_DEBOUNCE_MS);
    },
    [tableKey]
  );

  const toggleColumn = useCallback(
    (key) => {
      setVisibleKeySet((current) => {
        const willBeVisible = !current.has(key);
        if (!willBeVisible && current.size <= 1) {
          return current;
        }
        const next = new Set(current);
        if (willBeVisible) next.add(key);
        else next.delete(key);
        persist(orderedKeys, next);
        return next;
      });
    },
    [orderedKeys, persist]
  );

  const reorderColumns = useCallback(
    (activeKey, overKey) => {
      setOrderedKeys((current) => {
        const fromIndex = current.indexOf(activeKey);
        const toIndex = current.indexOf(overKey);
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return current;
        const next = arrayMove(current, fromIndex, toIndex);
        persist(next, visibleKeySet);
        return next;
      });
    },
    [persist, visibleKeySet]
  );

  const resetToDefault = useCallback(() => {
    setOrderedKeys(defaultKeyOrder);
    setVisibleKeySet(new Set(defaultVisibleKeyOrder));
    persist(defaultKeyOrder, new Set(defaultVisibleKeyOrder));
  }, [defaultKeyOrder, defaultVisibleKeyOrder, persist]);

  const chooserColumns = useMemo(
    () =>
      orderedKeys.map((key) => ({
        key,
        label: columnByKey[key]?.label || key,
        visible: visibleKeySet.has(key),
      })),
    [orderedKeys, visibleKeySet, columnByKey]
  );

  const visibleColumns = useMemo(() => {
    const visibleReorderable = orderedKeys
      .filter((key) => visibleKeySet.has(key))
      .map((key) => columnByKey[key])
      .filter(Boolean);
    return [...visibleReorderable, ...pinnedColumns];
  }, [orderedKeys, visibleKeySet, columnByKey, pinnedColumns]);

  const isDefault = useMemo(
    () =>
      orderedKeys.length === defaultKeyOrder.length &&
      orderedKeys.every((key, index) => key === defaultKeyOrder[index]) &&
      visibleKeySet.size === defaultVisibleKeyOrder.length &&
      defaultVisibleKeyOrder.every((key) => visibleKeySet.has(key)),
    [orderedKeys, defaultKeyOrder, defaultVisibleKeyOrder, visibleKeySet]
  );

  return {
    chooserColumns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetToDefault,
    loading,
    isDefault,
  };
}
