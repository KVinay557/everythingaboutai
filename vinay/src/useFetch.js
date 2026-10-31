import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

// `loading` is only true until the first response for a URL arrives, so calling
// reload() refreshes data in place without unmounting the page.
export function useFetch(url) {
  const [state, setState] = useState({ url: null, data: null, error: '' });

  const reload = useCallback(() => {
    if (!url) return;
    api
      .get(url)
      .then((data) => setState({ url, data, error: '' }))
      .catch((e) => setState((s) => ({ url, data: s.url === url ? s.data : null, error: e.message })));
  }, [url]);

  useEffect(reload, [reload]);
  return { data: state.data, error: state.error, loading: !!url && state.url !== url, reload };
}
