import type { BookingIntent } from "../types/api";
export interface Attempt {
  key: string;
  intent: BookingIntent;
  submitted: boolean;
}
const storageKey = (userId: number) => "restivio:booking-attempt:" + userId;
export const sameIntent = (a: BookingIntent, b: BookingIntent) =>
  a.hotelId === b.hotelId &&
  a.roomCategoryId === b.roomCategoryId &&
  a.checkIn === b.checkIn &&
  a.checkOut === b.checkOut &&
  a.numberOfRooms === b.numberOfRooms &&
  a.totalGuests === b.totalGuests;
export function readAttempt(userId: number): Attempt | null {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(storageKey(userId)) || "null",
    ) as Attempt | null;
    return value?.key && value.intent && typeof value.submitted === "boolean"
      ? value
      : null;
  } catch {
    return null;
  }
}
export function saveAttempt(userId: number, attempt: Attempt) {
  sessionStorage.setItem(storageKey(userId), JSON.stringify(attempt));
}
export function createAttempt(userId: number, intent: BookingIntent): Attempt {
  const attempt = { key: crypto.randomUUID(), intent, submitted: false };
  saveAttempt(userId, attempt);
  return attempt;
}
export function clearAttempt(userId: number) {
  sessionStorage.removeItem(storageKey(userId));
}
