export default function EventFilters({ search, statusFilter, sortDirection, onSearchChange, onStatusChange, onSortChange }) {
  return (
    <section className="filters" aria-label="Event filters">
      <label className="search-field">
        <span className="visually-hidden">Search events</span>
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          placeholder="Search events..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>

      <label className="filter-field">
        <span>Status</span>
        <select aria-label="Status Filter" value={statusFilter} onChange={(event) => onStatusChange(event.target.value)}>
          <option value="All">All</option>
          <option value="Planned">Planned</option>
          <option value="Completed">Completed</option>
        </select>
      </label>

      <label className="filter-field">
        <span>Sort by date</span>
        <select aria-label="Sort by date" value={sortDirection} onChange={(event) => onSortChange(event.target.value)}>
          <option value="asc">Earliest first</option>
          <option value="desc">Latest first</option>
        </select>
      </label>
    </section>
  );
}
