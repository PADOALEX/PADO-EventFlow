import EventRow from "./EventRow";

export default function EventTable({ events, totalEvents, isBusy, onEdit, onDelete, onMarkCompleted }) {
  const emptyMessage = totalEvents === 0 ? "No events yet." : "No events found.";

  return (
    <section className="panel table-panel" aria-labelledby="eventsTableTitle">
      <div className="section-heading table-heading">
        <div>
          <span className="eyebrow">EVENTS TABLE</span>
          <h2 id="eventsTableTitle">Your events</h2>
        </div>
        <span className="results-count">Showing {events.length} of {totalEvents} matching events</span>
      </div>

      {events.length === 0 ? (
        <div className="empty-state" role="status">
          <span aria-hidden="true">◎</span>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  isBusy={isBusy}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMarkCompleted={onMarkCompleted}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
