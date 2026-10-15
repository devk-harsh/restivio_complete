export const money = (value: number | string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
export const dateLabel = (value: string | null) =>
  value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not recorded";
export const roomLabel = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase() + " room";
export function dateAfter(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
