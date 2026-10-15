import { beforeEach, expect, it, vi } from "vitest";
import {
  createAttempt,
  readAttempt,
  saveAttempt,
  clearAttempt,
  sameIntent,
} from "./bookingAttempt";
import { stayError } from "./stay";
const intent = {
  hotelId: 1,
  roomCategoryId: 2,
  checkIn: "2027-01-01",
  checkOut: "2027-01-03",
  numberOfRooms: 1,
  totalGuests: 2,
};
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});
it("preserves the key and exact intent across page restoration until completed", () => {
  const attempt = createAttempt(1, intent);
  saveAttempt(1, { ...attempt, submitted: true });
  const restored = readAttempt(1);
  expect(restored).toEqual({ ...attempt, submitted: true });
  expect(readAttempt(2)).toBeNull();
  expect(sameIntent(restored!.intent, intent)).toBe(true);
  clearAttempt(1);
  expect(readAttempt(1)).toBeNull();
  expect(createAttempt(1, intent).key).not.toBe(attempt.key);
});
it("distinguishes date, guest, room, hotel, and category changes", () => {
  for (const altered of [
    { checkIn: "2027-01-02" },
    { checkOut: "2027-01-04" },
    { numberOfRooms: 2 },
    { totalGuests: 3 },
    { hotelId: 2 },
    { roomCategoryId: 3 },
  ])
    expect(sameIntent(intent, { ...intent, ...altered })).toBe(false);
});
it("rejects impossible dates, empty periods, overlong stays and fractional rooms", () => {
  expect(stayError(intent)).toBe("");
  for (const altered of [
    { checkIn: "2027-02-30" },
    { checkOut: "2027-01-01" },
    { checkOut: "2027-03-01" },
    { numberOfRooms: 1.5 },
    { totalGuests: 0 },
  ])
    expect(stayError({ ...intent, ...altered })).not.toBe("");
});
