import { useEffect, useState } from "react";

const EMPTY_FORM = {
  name: "",
  date: "",
  description: "",
  startTime: "",
  location: "",
  status: "Planned"
};

export default function EventForm({ editingEvent, onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingEvent) {
      setForm({
        name: editingEvent.name,
        date: editingEvent.date,
        description: editingEvent.description || "",
        startTime: editingEvent.startTime || "",
        location: editingEvent.location,
        status: editingEvent.status
      });
      setErrors({});
      setRequestError("");
      return;
    }

    setForm(EMPTY_FORM);
    setErrors({});
    setRequestError("");
  }, [editingEvent]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));

    if (errors[name] && value.trim()) {
      setErrors((current) => ({ ...current, [name]: "" }));
    }
  }

  function validate() {
    const nextErrors = {};

    if (form.name.trim().length > 120) nextErrors.name = "Maximum 120 characters.";
    if (!form.name.trim()) {
      nextErrors.name = "Event Name is required.";
    }
    if (!form.date) {
      nextErrors.date = "Date is required.";
    }
    if (form.location.trim().length > 160) nextErrors.location = "Maximum 160 characters.";
    if (!form.location.trim()) {
      nextErrors.location = "Location is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        location: form.location.trim(),
        startTime: form.startTime || null,
        description: form.description.trim() || null
      });
      setForm(EMPTY_FORM);
      setErrors({});
      setRequestError("");
    } catch (error) {
      setRequestError(error.message || "Could not save event.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setForm(EMPTY_FORM);
    setErrors({});
    onCancel();
  }

  return (
    <section className="panel event-form-panel" aria-labelledby="eventFormTitle">
      <div className="section-heading">
        <div>
          <span className="eyebrow">EVENT FORM</span>
          <h2 id="eventFormTitle">{editingEvent ? "Edit event" : "Create event"}</h2>
        </div>
        {editingEvent && <span className="editing-pill">Editing #{editingEvent.id}</span>}
      </div>

      <form className="event-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field field-wide">
          <label htmlFor="eventName">Event Name</label>
          <input
            id="eventName"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            disabled={isSaving}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "eventNameError" : undefined}
            maxLength={120}
            placeholder="e.g. React Workshop"
          />
          {errors.name && <small id="eventNameError" className="field-error">{errors.name}</small>}
        </div>

        <div className="form-field">
          <label htmlFor="eventDate">Date</label>
          <input
            id="eventDate"
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            disabled={isSaving}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? "eventDateError" : undefined}
          />
          {errors.date && <small id="eventDateError" className="field-error">{errors.date}</small>}
        </div>

        <div className="form-field">
          <label htmlFor="eventTime">Start time (optional)</label>
          <input id="eventTime" name="startTime" type="time" value={form.startTime} onChange={handleChange} disabled={isSaving} />
        </div>

        <div className="form-field">
          <label htmlFor="eventLocation">Location</label>
          <input
            id="eventLocation"
            name="location"
            type="text"
            value={form.location}
            onChange={handleChange}
            disabled={isSaving}
            aria-invalid={Boolean(errors.location)}
            aria-describedby={errors.location ? "eventLocationError" : undefined}
            maxLength={160}
            placeholder="e.g. Lviv"
          />
          {errors.location && <small id="eventLocationError" className="field-error">{errors.location}</small>}
        </div>

        <div className="form-field">
          <label htmlFor="eventStatus">Status</label>
          <select id="eventStatus" name="status" aria-label="Event Status" value={form.status} onChange={handleChange} disabled={isSaving}>
            <option value="Planned">Planned</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="form-field field-wide">
          <label htmlFor="eventDescription">Description (optional)</label>
          <textarea id="eventDescription" name="description" value={form.description} onChange={handleChange} disabled={isSaving} maxLength={2000} rows={3} placeholder="What is this event about?" />
        </div>
        {requestError && <div className="field-error field-wide" role="alert">{requestError}</div>}
        <div className="form-actions field-wide">
          {editingEvent && (
            <button type="button" className="button button-secondary" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </button>
          )}
          <button type="submit" className="button button-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : editingEvent ? "Save Changes" : "Add Event"}
          </button>
        </div>
      </form>
    </section>
  );
}
