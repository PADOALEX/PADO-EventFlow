import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

const originalFetch = global.fetch;
const samples = [
  { id: "11111111-1111-1111-1111-111111111111", name: "React Workshop", date: "2026-11-01", startTime: null, description: null, location: "Lviv", status: "Planned" },
  { id: "22222222-2222-2222-2222-222222222222", name: "Portfolio Review", date: "2026-11-08", startTime: null, description: null, location: "Online", status: "Completed" },
];
let database;
let requests;
let failNext;
function json(body, status = 200) { return { ok: status < 400, status, json: async () => body }; }

beforeEach(() => {
  database = samples.map((e) => ({ ...e }));
  requests = [];
  failNext = false;
  global.fetch = jest.fn(async (url, options = {}) => {
    const method = options.method || "GET";
    requests.push({ url: String(url), method });
    if (failNext) { failNext = false; return json({ title: "Database unavailable" }, 503); }
    const pathname = String(url).split("?")[0];
    const params = new URL(String(url), "http://localhost").searchParams;
    if (pathname === "/api/events/stats") return json({ total: database.length,
      planned: database.filter((e) => e.status === "Planned").length,
      completed: database.filter((e) => e.status === "Completed").length });
    if (pathname === "/api/events" && method === "GET") {
      let selected = database.filter((e) => e.name.toLowerCase().includes((params.get("search") || "").toLowerCase()));
      if (params.get("status")) selected = selected.filter((e) => e.status === params.get("status"));
      selected.sort((a, b) => a.date.localeCompare(b.date) * (params.get("direction") === "desc" ? -1 : 1));
      const page = Number(params.get("page") || 1), size = Number(params.get("pageSize") || 10);
      return json({ items: selected.slice((page - 1) * size, page * size), totalCount: selected.length,
        page, pageSize: size, totalPages: Math.ceil(selected.length / size) });
    }
    if (pathname === "/api/events" && method === "POST") {
      const item = { ...JSON.parse(options.body), id: crypto.randomUUID() };
      database.push(item);
      return json(item, 201);
    }
    const id = pathname.split("/")[3];
    const existing = database.find((e) => e.id === id);
    if (method === "PUT" && existing) { Object.assign(existing, JSON.parse(options.body)); return json(existing); }
    if (method === "PATCH" && existing) { existing.status = "Completed"; return json(existing); }
    if (method === "DELETE" && existing) { database = database.filter((e) => e.id !== id); return { ok: true, status: 204 }; }
    return json({ title: "Not found" }, 404);
  });
  jest.spyOn(window, "confirm").mockReturnValue(true);
  window.scrollTo = jest.fn();
});
afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });

async function ready() { await screen.findByText("React Workshop"); }
async function fillForm(user) {
  await user.type(screen.getByLabelText("Event Name"), "Demo Conference");
  await user.type(screen.getByLabelText("Date"), "2026-12-05");
  await user.type(screen.getByLabelText("Location"), "Lutsk");
}

test("loads real API data and global stats", async () => {
  render(<App />);
  await ready();
  expect(screen.getByText("Portfolio Review")).toBeInTheDocument();
  expect(within(screen.getByLabelText("Event statistics")).getByText("2")).toBeInTheDocument();
  expect(requests.some((r) => r.url.startsWith("/api/events?"))).toBe(true);
  expect(requests.some((r) => r.url === "/api/events/stats")).toBe(true);
});

test("creates event with POST and shows it from GET", async () => {
  const user = userEvent.setup(); render(<App />); await ready();
  await fillForm(user);
  await user.click(screen.getByRole("button", { name: "Add Event" }));
  expect(await screen.findByText("Demo Conference")).toBeInTheDocument();
  expect(requests.some((r) => r.method === "POST")).toBe(true);
});

test("validates required fields without API request", async () => {
  const user = userEvent.setup(); render(<App />); await ready();
  const before = requests.length;
  await user.click(screen.getByRole("button", { name: "Add Event" }));
  expect(screen.getByText("Event Name is required.")).toBeInTheDocument();
  expect(requests.length).toBe(before);
});

test("updates existing event over PUT", async () => {
  const user = userEvent.setup(); render(<App />); await ready();
  await user.click(within(screen.getByText("React Workshop").closest("tr")).getByRole("button", { name: "Edit" }));
  const name = screen.getByLabelText("Event Name"); await user.clear(name); await user.type(name, "Advanced React");
  await user.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(await screen.findByText("Advanced React")).toBeInTheDocument();
  expect(requests.some((r) => r.method === "PUT")).toBe(true);
});

test("deletes event after confirmation and refreshes stats", async () => {
  const user = userEvent.setup(); render(<App />); await ready();
  await user.click(within(screen.getByText("React Workshop").closest("tr")).getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(screen.queryByText("React Workshop")).not.toBeInTheDocument());
  expect(window.confirm).toHaveBeenCalled();
  expect(requests.some((r) => r.method === "DELETE")).toBe(true);
});

test("marks a planned event as completed via PATCH", async () => {
  const user = userEvent.setup(); render(<App />); await ready();
  await user.click(within(screen.getByText("React Workshop").closest("tr")).getByRole("button", { name: "Mark as Completed" }));
  await waitFor(() => expect(within(screen.getByText("React Workshop").closest("tr")).getByText("Completed")).toBeInTheDocument());
  expect(requests.some((r) => r.method === "PATCH")).toBe(true);
});

test("uses server-side search and status filtering", async () => {
  const user = userEvent.setup(); render(<App />); await ready();
  await user.type(screen.getByPlaceholderText("Search events..."), "Portfolio");
  await waitFor(() => expect(requests.some((r) => r.url.includes("search=Portfolio"))).toBe(true));
  await waitFor(() => expect(screen.queryByText("React Workshop")).not.toBeInTheDocument());
  await user.selectOptions(screen.getByLabelText("Status Filter"), "Planned");
  await waitFor(() => expect(screen.getByText("No events found.")).toBeInTheDocument());
});

test("shows API errors and allows retry", async () => {
  failNext = true;
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Database unavailable");
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
  await ready();
});

test("does not clear unsaved form after failed POST", async () => {
  const user = userEvent.setup(); render(<App />); await ready();
  await fillForm(user); failNext = true;
  await user.click(screen.getByRole("button", { name: "Add Event" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Database unavailable");
  expect(screen.getByLabelText("Event Name")).toHaveValue("Demo Conference");
});
