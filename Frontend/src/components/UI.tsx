import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Hotel, Stay, Availability } from "../types/api";
import { hotelsApi } from "../api/hotels.api";
import { useLoad } from "../hooks/useLoad";
import { money, roomLabel } from "../utils/format";
import { queryString } from "../utils/stay";
export function Loading({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      {text}
    </div>
  );
}
export function Feedback({
  children,
  success = false,
}: {
  children: ReactNode;
  success?: boolean;
}) {
  return (
    <div
      className={"feedback " + (success ? "success" : "error")}
      role={success ? "status" : "alert"}
    >
      {children}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-mark">◇</span>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function Status({ value }: { value: string }) {
  return <span className={"badge " + value.toLowerCase()}>{value}</span>;
}
export function HotelArt({
  variant = 0,
  hero = false,
}: {
  variant?: number;
  hero?: boolean;
}) {
  return (
    <div
      className={"hotel-art art-" + (variant % 3) + (hero ? " hero-art" : "")}
      aria-hidden="true"
    >
      <div className="art-sun" />
      <div className="art-cloud" />
      <div className="art-building">
        <div className="art-roof" />
        <div className="art-windows">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
        <div className="art-door" />
      </div>
      <div className="art-tree tree-one" />
      <div className="art-tree tree-two" />
      <span className="art-caption">RESTIVIO · STAY INSPIRED</span>
    </div>
  );
}
export function HotelCard({
  hotel,
  stay,
  availability,
  availabilityError,
}: {
  hotel: Hotel;
  stay?: Stay;
  availability?: Availability;
  availabilityError?: string;
}) {
  const rooms = useLoad(() => hotelsApi.categories(hotel.id), String(hotel.id));
  const available = availability?.categories.filter((c) => c.isAvailable) || [];
  const prices = availability
    ? available.map((c) => c.pricePerNight)
    : rooms.data?.map((c) => c.price) || [];
  const minimum = prices.length ? Math.min(...prices) : null;
  return (
    <Link
      className="hotel-card"
      to={"/hotels/" + hotel.id + (stay ? "?" + queryString(stay) : "")}
    >
      <HotelArt variant={hotel.id} />
      <div className="hotel-card-body">
        <div className="eyebrow">{hotel.location}</div>
        <h3>{hotel.name}</h3>
        <p>{hotel.address}</p>
        <div className="hotel-price">
          {minimum !== null ? (
            <>
              <strong>{money(minimum)}</strong>
              <span>from / room / night</span>
            </>
          ) : (
            <span>
              {rooms.loading
                ? "Loading room prices…"
                : availability
                  ? "No rooms for these dates"
                  : "Rooms not listed yet"}
            </span>
          )}
        </div>
        {availabilityError ? (
          <p className="availability-error">
            Availability could not be checked. Open this hotel to retry.
          </p>
        ) : availability ? (
          <p
            className={
              "availability-label " +
              (available.length ? "available" : "unavailable-label")
            }
          >
            {available.length
              ? "✓ Rooms available for your dates"
              : "No availability · try other dates"}
          </p>
        ) : (
          <p className="room-types">
            {rooms.data?.map((c) => roomLabel(c.roomType)).join(" · ") ||
              (rooms.error
                ? "Open hotel to check room details."
                : "Choose dates to check availability.")}
          </p>
        )}
        <div className="card-bottom">
          <span>
            {availability && !available.length
              ? "Change dates"
              : "View rooms & book"}
          </span>
          <span aria-hidden="true">↗</span>
        </div>
      </div>
    </Link>
  );
}
export function StayForm({
  value,
  onChange,
  onSubmit,
  busy = false,
  label = "Search availability",
}: {
  value: Stay;
  onChange: (s: Stay) => void;
  onSubmit: () => void;
  busy?: boolean;
  label?: string;
}) {
  return (
    <form
      className="stay-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label>
        Check-in
        <input
          required
          aria-label="Check-in"
          type="date"
          value={value.checkIn}
          onChange={(e) => onChange({ ...value, checkIn: e.target.value })}
        />
      </label>
      <label>
        Check-out
        <input
          required
          aria-label="Check-out"
          type="date"
          value={value.checkOut}
          onChange={(e) => onChange({ ...value, checkOut: e.target.value })}
        />
      </label>
      <label>
        Rooms
        <input
          required
          type="number"
          min="1"
          max="100"
          value={value.numberOfRooms}
          onChange={(e) =>
            onChange({ ...value, numberOfRooms: Number(e.target.value) })
          }
        />
      </label>
      <label>
        Guests
        <input
          required
          type="number"
          min="1"
          max="1000"
          value={value.totalGuests}
          onChange={(e) =>
            onChange({ ...value, totalGuests: Number(e.target.value) })
          }
        />
      </label>
      <button className="button" disabled={busy}>
        {busy ? "Searching…" : label}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="modal-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
