export function formatDate(date?: Date) {
  if (!date) return "Undated";

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}
