export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('js_token');
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Do not set Content-Type if sending FormData (let browser set multipart boundary)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  // Handle blob or csv download
  if (headers['Accept'] === 'text/csv' || endpoint.includes('/export-csv')) {
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
  }

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export default apiFetch;
