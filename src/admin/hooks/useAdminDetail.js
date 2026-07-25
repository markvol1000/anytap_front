import { useEffect, useState } from 'react';

export function useAdminDetail(fetchById, selectedId) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    fetchById(selectedId)
      .then((data) => { if (!cancelled) setDetail(data); })
      .catch(() => { if (!cancelled) setDetail(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchById, selectedId]);

  return { detail, loading, setDetail };
}
