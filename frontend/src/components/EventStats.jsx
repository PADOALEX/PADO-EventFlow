export default function EventStats({ stats }) {
  return (
    <section className="stats-grid" aria-label="Event statistics">
      <article className="stat-card">
        <span>Total events</span>
        <strong>{stats.total}</strong>
      </article>
      <article className="stat-card">
        <span>Planned</span>
        <strong>{stats.planned}</strong>
      </article>
      <article className="stat-card">
        <span>Completed</span>
        <strong>{stats.completed}</strong>
      </article>
    </section>
  );
}
