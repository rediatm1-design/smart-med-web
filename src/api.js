export const API_BASE_URL = "https://medication.infancyapp.com/api";

function getToken() {
  return localStorage.getItem("token") || "";
}

async function parseJsonSafely(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (err) {
    return text;
  }
}

function formatErrors(data, fallback) {
  if (!data) return fallback;

  if (data.errors && typeof data.errors === "object") {
    return Object.values(data.errors)
      .flat()
      .filter(Boolean)
      .join(" ");
  }

  return data.message || data.error || fallback;
}

export function getCollection(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  return [];
}

export function getRecord(data) {
  return data?.data && !Array.isArray(data.data) ? data.data : data;
}

export function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(formatErrors(data, "Request failed."));
  }

  return data;
}
