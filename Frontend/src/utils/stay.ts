import type { Stay } from "../types/api";
import { dateAfter } from "./format";
export function readStay(params: URLSearchParams): Stay {
  return {
    checkIn: params.get("checkIn") || dateAfter(7),
    checkOut: params.get("checkOut") || dateAfter(9),
    numberOfRooms: Number(params.get("numberOfRooms") || 1),
    totalGuests: Number(params.get("totalGuests") || 2),
  };
}
export function stayError(stay: Stay): string {
  const validDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(stay.checkIn) || !validDate(stay.checkOut))
    return "Choose valid check-in and check-out dates.";
  const nights =
    (Date.parse(stay.checkOut) - Date.parse(stay.checkIn)) / 86400000;
  if (nights < 1 || nights > 30)
    return "Choose a stay between 1 and 30 nights.";
  if (
    !Number.isInteger(stay.numberOfRooms) ||
    stay.numberOfRooms < 1 ||
    stay.numberOfRooms > 100
  )
    return "Choose between 1 and 100 rooms.";
  if (
    !Number.isInteger(stay.totalGuests) ||
    stay.totalGuests < 1 ||
    stay.totalGuests > 1000
  )
    return "Choose between 1 and 1,000 guests.";
  return "";
}
export function queryString(value: object) {
  return new URLSearchParams(
    Object.entries(value).map(([k, v]) => [k, String(v)]),
  ).toString();
}
