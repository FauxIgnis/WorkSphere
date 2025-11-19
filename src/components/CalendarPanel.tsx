import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

export function CalendarPanel() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
  });

  const events = useQuery(api.calendar.getUserEvents, {}) || [];
  const createEvent = useMutation(api.calendar.createEvent);
  const updateEvent = useMutation(api.calendar.updateEvent);
  const removeEvent = useMutation(api.calendar.deleteEvent);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !newEvent.startTime || !newEvent.endTime) return;

    try {
      await createEvent({
        title: newEvent.title,
        description: newEvent.description || undefined,
        startTime: new Date(newEvent.startTime).getTime(),
        endTime: new Date(newEvent.endTime).getTime(),
        location: newEvent.location || undefined,
      });

      setNewEvent({ title: "", description: "", startTime: "", endTime: "", location: "" });
      setShowCreateForm(false);
      toast.success("Event created successfully");
    } catch (error) {
      toast.error("Failed to create event");
      console.error("Create event error:", error);
    }
  };

  const handleEditEvent = (event: (typeof events)[number]) => {
    setEditingEventId(event._id);
    setEventForm({
      title: event.title,
      description: event.description || "",
      startTime: new Date(event.startTime).toISOString().slice(0, 16),
      endTime: new Date(event.endTime).toISOString().slice(0, 16),
      location: event.location || "",
    });
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEventId || !eventForm.title.trim() || !eventForm.startTime || !eventForm.endTime) return;

    try {
      await updateEvent({
        eventId: editingEventId as any,
        title: eventForm.title,
        description: eventForm.description || undefined,
        startTime: new Date(eventForm.startTime).getTime(),
        endTime: new Date(eventForm.endTime).getTime(),
        location: eventForm.location || undefined,
      });
      toast.success("Event updated");
      setEditingEventId(null);
    } catch (error) {
      console.error("Update event error:", error);
      toast.error("Failed to update event");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const confirmed = window.confirm("Delete this event? This cannot be undone.");
    if (!confirmed) return;

    try {
      await removeEvent({ eventId: eventId as any });
      toast.success("Event deleted");
      if (editingEventId === eventId) {
        setEditingEventId(null);
      }
    } catch (error) {
      console.error("Delete event error:", error);
      toast.error("Failed to delete event");
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fdfcf8]">
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6 px-6 py-8">
          <div className="rounded-3xl border border-neutral-200/70 bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-neutral-400">Calendar</p>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-900">Workspace Schedule</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Keep your legal research, meetings, and deadlines aligned across the team.
                </p>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700"
              >
                <PlusIcon className="h-4 w-4" />
                New Event
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-neutral-200/70 bg-white shadow-sm">
            {showCreateForm && (
              <div className="border-b border-neutral-200/70 bg-[#f7f6f3]/60 px-6 py-6">
                <form onSubmit={handleCreateEvent} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                      Event Title
                    </label>
                    <input
                      type="text"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                      placeholder="What are we scheduling?"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                      Description
                    </label>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                      rows={3}
                      placeholder="Add agenda or notes for collaborators..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                      Start Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                      End Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                      Location
                    </label>
                    <input
                      type="text"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                      placeholder="Virtual link or meeting room (optional)"
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                      Create Event
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-5 py-2 text-sm font-medium text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {events.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-[#f7f6f3]/60 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                    <CalendarIcon className="h-8 w-8 text-neutral-400" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-neutral-900">No events scheduled</h3>
                  <p className="mt-2 max-w-md text-sm text-neutral-500">
                    Create your first event to align your workspace timeline.
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-800"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Plan something new
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => {
                    const isEditing = editingEventId === event._id;
                    return (
                      <div
                        key={event._id}
                        className="rounded-2xl border border-neutral-200/80 bg-white px-5 py-5 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-semibold text-neutral-900">{event.title}</h3>
                                {event.description && (
                                  <p className="mt-3 text-sm text-neutral-600">{event.description}</p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditEvent(event)}
                                  className="rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                                  title="Edit event"
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEvent(event._id)}
                                  className="rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-red-500"
                                  title="Delete event"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-neutral-500">
                              <span className="inline-flex items-center gap-1">
                                <ClockIcon className="h-4 w-4 text-neutral-400" />
                                {new Date(event.startTime).toLocaleString()} – {new Date(event.endTime).toLocaleString()}
                              </span>

                              {event.location && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPinIcon className="h-4 w-4 text-neutral-400" />
                                  {event.location}
                                </span>
                              )}

                              {event.creator && (
                                <span className="inline-flex items-center gap-1">
                                  <UsersIcon className="h-4 w-4 text-neutral-400" />
                                  Created by {event.creator.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
                            {new Date(event.startTime).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>

                        {isEditing && (
                          <div className="mt-5 rounded-2xl border border-neutral-200 bg-[#f7f6f3]/70 px-4 py-4">
                            <div className="mb-3 flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-neutral-700">Edit Event</h4>
                              <button
                                onClick={() => setEditingEventId(null)}
                                className="rounded-full p-1 text-neutral-400 transition hover:bg-neutral-200"
                                title="Close editor"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <form onSubmit={handleUpdateEvent} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div className="md:col-span-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                                  Title
                                </label>
                                <input
                                  type="text"
                                  value={eventForm.title}
                                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                                  className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
                                  required
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                                  Description
                                </label>
                                <textarea
                                  value={eventForm.description}
                                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                                  className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
                                  rows={3}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                                  Start time
                                </label>
                                <input
                                  type="datetime-local"
                                  value={eventForm.startTime}
                                  onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                                  className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
                                  required
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                                  End time
                                </label>
                                <input
                                  type="datetime-local"
                                  value={eventForm.endTime}
                                  onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                                  className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
                                  required
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                                  Location
                                </label>
                                <input
                                  type="text"
                                  value={eventForm.location}
                                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                                  className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
                                />
                              </div>
                              <div className="md:col-span-2 flex flex-wrap gap-2">
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
                                >
                                  Save changes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingEventId(null)}
                                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
