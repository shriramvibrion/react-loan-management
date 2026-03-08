import config from "./config";

/**
 * Centralized API client with error handling.
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${config.API_BASE_URL}${endpoint}`;

  const defaultHeaders = {};
  if (!(options.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const MAX_RETRIES = 3;
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      const data = await response.json().catch(() => ({})); // Handle cases where body isn't JSON

      if (!response.ok) {
        // If it's a 500 or timeout, we might want to retry
        if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
          console.warn(`API Error ${response.status}. Retrying in 1s...`);
          await new Promise(res => setTimeout(res, 1000));
          attempt++;
          continue;
        }
        const message = data.error || data.message || `Request failed (${response.status})`;
        throw new Error(message);
      }

      return data;
    } catch (error) {
      if (attempt < MAX_RETRIES - 1) {
        console.warn(`Network/Fetch Error: ${error.message}. Retrying in 1s...`);
        await new Promise(res => setTimeout(res, 1000));
        attempt++;
      } else {
        throw error;
      }
    }
  }
}

export const api = {
  get: (endpoint) => apiRequest(endpoint),
  post: (endpoint, body) =>
    apiRequest(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: (endpoint, body) =>
    apiRequest(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

export default api;

// Re-export the base URL for backward compatibility (document viewer, etc.)
export const API_BASE_URL = config.API_BASE_URL;
