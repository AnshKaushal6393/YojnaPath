function toDateInput(value) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return String(value);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function toGoogleDateTime(value) {
  const parsed = new Date(value);
  return parsed.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeCalendarText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function openGoogleCalendarEvent({ title, date, details = "" }) {
  const normalized = toDateInput(date);
  if (!normalized) {
    return;
  }

  const start = new Date(`${normalized}T09:00:00`);
  const end = new Date(`${normalized}T09:30:00`);
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", title);
  url.searchParams.set("dates", `${toGoogleDateTime(start)}/${toGoogleDateTime(end)}`);
  url.searchParams.set("details", details);
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

export function downloadCalendarFile({ title, date, details = "" }) {
  const normalized = toDateInput(date);
  if (!normalized) {
    return;
  }

  const start = `${normalized.replace(/-/g, "")}T090000`;
  const end = `${normalized.replace(/-/g, "")}T093000`;
  const contents = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `SUMMARY:${escapeCalendarText(title)}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `DESCRIPTION:${escapeCalendarText(details)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");

  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-reminder.ics`;
  link.click();
  URL.revokeObjectURL(href);
}

export function downloadCalendarBundle(events) {
  const validEvents = (events || []).filter((event) => toDateInput(event.date));
  if (!validEvents.length) {
    return;
  }

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0"];

  validEvents.forEach((event) => {
    const normalized = toDateInput(event.date);
    const start = `${normalized.replace(/-/g, "")}T090000`;
    const end = `${normalized.replace(/-/g, "")}T093000`;

    lines.push("BEGIN:VEVENT");
    lines.push(`SUMMARY:${escapeCalendarText(event.title)}`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(`DESCRIPTION:${escapeCalendarText(event.details || "")}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");

  const blob = new Blob([lines.join("\n")], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = "yojnapath-reminders.ics";
  link.click();
  URL.revokeObjectURL(href);
}
