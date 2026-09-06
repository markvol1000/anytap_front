import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const DEFAULT_PAGE_SIZE = 10;
const EMPTY_URL_KEYS = Object.freeze([]);

function pickUrlFilters(searchParams, urlKeys) {
  const out = {};
  urlKeys.forEach((key) => {
    const v = searchParams.get(key);
    if (v != null && v !== '') out[key] = v;
  });
  return out;
}

function mergeFilters(initialFilters, urlFilters) {
  return { ...initialFilters, ...urlFilters };
}

/**
 * Shared list hook — search, filter, sort, pagination via service fetcher.
 * @param {(params: object) => Promise<{ items, total, page, pageSize, totalPages }>} fetcher
 * @param {object} [initialFilters]
 * @param {{ urlKeys?: string[] }} [options]
 */
export function useAdminList(fetcher, initialFilters = {}, options = {}) {
  const urlKeysSig = (options.urlKeys ?? EMPTY_URL_KEYS).join('|');
  const [searchParams] = useSearchParams();

  const urlFilters = useMemo(() => {
    const keys = urlKeysSig ? urlKeysSig.split('|') : EMPTY_URL_KEYS;
    return pickUrlFilters(searchParams, keys);
  }, [searchParams, urlKeysSig]);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(() => mergeFilters(initialFilters, urlFilters));
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setFilters((prev) => {
      const next = mergeFilters(initialFilters, urlFilters);
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
    setPage(1);
  }, [urlFilters]); // eslint-disable-line react-hooks/exhaustive-deps -- initialFilters static per page

  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher({
      page,
      pageSize,
      search,
      sortKey,
      sortDir,
      ...filters,
    })
      .then((result) => {
        if (cancelled) return;
        setItems(Array.isArray(result?.items) ? result.items : []);
        setTotal(result?.total ?? 0);
        setTotalPages(result?.totalPages ?? 1);
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([]);
          setError(err?.message ?? 'Failed to load data');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [fetcher, page, pageSize, search, sortKey, sortDir, filters, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const toggleSort = useCallback((key) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return key;
      }
      setSortDir('asc');
      return key;
    });
    setPage(1);
  }, []);

  const handleSearch = useCallback((value) => {
    setSearch(value);
    setPage(1);
  }, []);

  return {
    items,
    setItems,
    total,
    page,
    pageSize,
    totalPages,
    search,
    filters,
    sortKey,
    sortDir,
    loading,
    error,
    setPage,
    setSearch: handleSearch,
    setFilter,
    toggleSort,
    reload,
    refresh: reload,
  };
}
