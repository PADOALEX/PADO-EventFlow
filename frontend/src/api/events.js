const BASE_URL = (globalThis.__EVENTFLOW_API_URL__ || "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Cannot connect to the API. Check that the backend is running.", 0);
  }
  if (!response.ok) {
    let details;
    try { details = await response.json(); } catch { /* Non-JSON error body */ }
    const validationErrors = details?.errors ? Object.values(details.errors).flat() : [];
    const message = validationErrors[0] || details?.detail || details?.title || `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return null;
  return response.json();
}

export function listEvents({ search, status, direction, page, pageSize = 10 }, signal) {
  const q = new URLSearchParams({ direction, sort: "date", page: String(page), pageSize: String(pageSize) });
  if (search.trim()) q.set("search", search.trim());
  if (status !== "All") q.set("status", status);
  return request(`/events?${q}`, { signal });
}
export const getStats = (signal) => request("/events/stats", { signal });
export const createEvent = (event) => request("/events", { method: "POST", body: JSON.stringify(event) });
export const updateEvent = (id, event) => request(`/events/${id}`, { method: "PUT", body: JSON.stringify(event) });
export const deleteEvent = (id) => request(`/events/${id}`, { method: "DELETE" });
export const completeEvent = (id) => request(`/events/${id}/complete`, { method: "PATCH" });
