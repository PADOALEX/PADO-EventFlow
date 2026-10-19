import { useCallback, useEffect, useRef, useState } from "react";
import EventFilters from "./components/EventFilters";
import EventForm from "./components/EventForm";
import EventStats from "./components/EventStats";
import EventTable from "./components/EventTable";
import Notification from "./components/Notification";
import { completeEvent, createEvent, deleteEvent, getStats, listEvents, updateEvent } from "./api/events";

const PAGE_SIZE = 10;
const EMPTY_STATS = { total: 0, planned: 0, completed: 0 };

export default function App() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [editingEvent, setEditingEvent] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortDirection, setSortDirection] = useState("asc");
  const [page, setPage] = useState(1);
  const [notification, setNotification] = useState("");
  const [busyEventId, setBusyEventId] = useState(null);
  const [reload, setReload] = useState(0);
  const firstLoad = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      setError("");
      if (!firstLoad.current) setRefreshing(true);
      try {
        const [result, summary] = await Promise.all([
          listEvents({ search: debouncedSearch, status: statusFilter, direction: sortDirection, page, pageSize: PAGE_SIZE }, controller.signal),
          getStats(controller.signal),
        ]);
        if (!active) return;
        setEvents(result.items);
        setTotalCount(result.totalCount);
        setTotalPages(result.totalPages);
        setStats(summary);
      } catch (err) {
        if (active && err.name !== "AbortError") setError(err.message);
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
          firstLoad.current = false;
        }
      }
    };
    load();
    return () => { active = false; controller.abort(); };
  }, [debouncedSearch, statusFilter, sortDirection, page, reload]);

  const refresh = () => setReload((value) => value + 1);
  const showNotification = useCallback((message) => setNotification(message), []);
  const closeNotification = useCallback(() => setNotification(""), []);
  const handleSearchChange = (value) => { setSearch(value); setPage(1); };
  const handleStatusChange = (value) => { setStatusFilter(value); setPage(1); };
  const handleSortChange = (value) => { setSortDirection(value); setPage(1); };

  async function handleSaveEvent(formEvent) {
    if (editingEvent) {
      await updateEvent(editingEvent.id, formEvent);
      setEditingEvent(null);
      showNotification("Event updated successfully!");
    } else {
      await createEvent(formEvent);
      setPage(1);
      showNotification("Event added successfully!");
    }
    refresh();
  }

  function handleEdit(event) {
    setEditingEvent(event);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(event) {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    setBusyEventId(event.id);
    setError("");
    try {
      await deleteEvent(event.id);
      if (editingEvent?.id === event.id) setEditingEvent(null);
      if (events.length === 1 && page > 1) setPage(page - 1);
      refresh();
      showNotification("Event deleted successfully!");
    } catch (err) { setError(err.message); }
    finally { setBusyEventId(null); }
  }

  async function handleMarkCompleted(id) {
    setBusyEventId(id);
    setError("");
    try {
      const updated = await completeEvent(id);
      if (editingEvent?.id === id) setEditingEvent(updated);
      refresh();
      showNotification("Event marked as completed!");
    } catch (err) { setError(err.message); }
    finally { setBusyEventId(null); }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="./" aria-label="PADO EventFlow home">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span><strong>PADO</strong><small>EventFlow</small></span>
        </a>
        <span className="course-chip">Full-Stack Event Manager</span>
      </header>
      <main className="page-content">
        <section className="hero">
          <div>
            <span className="eyebrow">YOUR EVENT WORKSPACE</span>
            <h1>Plan events without the clutter.</h1>
            <p>Add, edit, find and track events in one responsive workspace, backed by ASP.NET Core and PostgreSQL.</p>
          </div>
          <div className="hero-badge" aria-label={`${stats.completed} completed events`}>
            <strong>{stats.completed}</strong><span>completed</span>
          </div>
        </section>
        {error && <div className="error-banner" role="alert">{error} <button type="button" onClick={refresh}>Retry</button></div>}
        <EventStats stats={stats} />
        <EventForm editingEvent={editingEvent} onSave={handleSaveEvent} onCancel={() => setEditingEvent(null)} />
        <section className="panel events-workspace" aria-labelledby="workspaceTitle">
          <div className="section-heading workspace-heading">
            <div><span className="eyebrow">FIND & FILTER</span><h2 id="workspaceTitle">Event workspace</h2></div>
          </div>
          <EventFilters search={search} statusFilter={statusFilter} sortDirection={sortDirection}
            onSearchChange={handleSearchChange} onStatusChange={handleStatusChange} onSortChange={handleSortChange} />
        </section>
        {loading ? (
          <section className="panel loading-panel" aria-live="polite"><div className="loading-spinner" aria-hidden="true" />Loading events from the API...</section>
        ) : (
          <>
            {refreshing && <div className="refresh-status" role="status">Refreshing events...</div>}
            <EventTable events={events} totalEvents={totalCount} isBusy={busyEventId !== null || refreshing}
              onEdit={handleEdit} onDelete={handleDelete} onMarkCompleted={handleMarkCompleted} />
            {totalPages > 1 && <nav className="pagination" aria-label="Event pages">
              <button type="button" disabled={page === 1 || refreshing} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" disabled={page >= totalPages || refreshing} onClick={() => setPage(page + 1)}>Next</button>
            </nav>}
          </>
        )}
      </main>
      <footer className="app-footer"><span>React + Vite · ASP.NET Core · PostgreSQL</span><span>2026 PADO</span></footer>
      <Notification message={notification} onClose={closeNotification} />
    </div>
  );
}
