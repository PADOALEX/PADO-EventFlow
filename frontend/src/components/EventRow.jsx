function formatDisplayDate(dateValue) {
  const [year, month, day] = dateValue.split("-");
  return `${day}.${month}.${year}`;
}

export default function EventRow({ event, isBusy, onEdit, onDelete, onMarkCompleted }) {
  return (
    <tr>
      <td data-label="Event">
        <div className="event-name-cell">
          <span className={`event-dot ${event.status === "Completed" ? "event-dot-completed" : ""}`} aria-hidden="true" />
          <strong>{event.name}</strong>
        </div>
      </td>
      <td data-label="Date">{formatDisplayDate(event.date)}{event.startTime ? ` · ${event.startTime.slice(0, 5)}` : ""}</td>
      <td data-label="Location">{event.location}</td>
      <td data-label="Status">
        <span className={`status-badge ${event.status === "Completed" ? "status-completed" : "status-planned"}`}>
          {event.status}
        </span>
      </td>
      <td data-label="Actions">
        <div className="row-actions">
          {event.status === "Planned" && (
            <button type="button" className="table-action action-complete" onClick={() => onMarkCompleted(event.id)} disabled={isBusy}>
              Mark as Completed
            </button>
          )}
          <button type="button" className="table-action" onClick={() => onEdit(event)} disabled={isBusy}>
            Edit
          </button>
          <button type="button" className="table-action action-delete" onClick={() => onDelete(event)} disabled={isBusy}>
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
