import { useRef, useState, type ReactNode } from "react";
import axios from "axios";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { bookingsApi } from "../api/bookings.api";
import { hotelsApi } from "../api/hotels.api";
import { useLoad } from "../hooks/useLoad";
import { Empty, Feedback, Loading, Modal, Status } from "../components/UI";
import { dateLabel, money, roomLabel } from "../utils/format";
import { errorMessage } from "../utils/errors";
import { queryString, readStay, stayError } from "../utils/stay";
import {
  clearAttempt,
  createAttempt,
  readAttempt,
  sameIntent,
  saveAttempt,
  type Attempt,
} from "../utils/bookingAttempt";
import type { Booking, BookingIntent } from "../types/api";
export function BookingReview() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const intent: BookingIntent = {
    ...readStay(params),
    hotelId: Number(params.get("hotelId")),
    roomCategoryId: Number(params.get("roomCategoryId")),
  };
  const intentKey = queryString(intent);
  const [attempt, setAttempt] = useState<Attempt | null>(() => {
    const old = readAttempt(user!.id);
    return old && (sameIntent(old.intent, intent) || old.submitted)
      ? old
      : createAttempt(user!.id, intent);
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [definitive, setDefinitive] = useState(false);
  const guard = useRef(false);
  const invalid =
    stayError(intent) ||
    (!Number.isInteger(intent.hotelId) ||
    intent.hotelId < 1 ||
    !Number.isInteger(intent.roomCategoryId) ||
    intent.roomCategoryId < 1
      ? "Please select a hotel and room first."
      : "");
  const data = useLoad(async () => {
    if (invalid) throw new Error(invalid);
    const [hotel, availability] = await Promise.all([
      hotelsApi.get(intent.hotelId),
      hotelsApi.availability(intent.hotelId, intent),
    ]);
    return {
      hotel,
      category: availability.categories.find(
        (c) => c.roomCategoryId === intent.roomCategoryId,
      ),
    };
  }, intentKey);
  const previous = attempt && !sameIntent(attempt.intent, intent);
  async function submit() {
    if (guard.current || !attempt || previous || definitive) return;
    guard.current = true;
    setBusy(true);
    setError("");
    const pending = { ...attempt, submitted: true };
    setAttempt(pending);
    saveAttempt(user!.id, pending);
    try {
      const booking = await bookingsApi.create(intent, pending.key);
      clearAttempt(user!.id);
      navigate("/bookings/" + booking.id + "?confirmed=1", { replace: true });
    } catch (e) {
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;
      const terminal =
        status !== undefined &&
        status >= 400 &&
        status < 500 &&
        status !== 401 &&
        status !== 408 &&
        status !== 429;
      if (terminal) {
        clearAttempt(user!.id);
        setDefinitive(true);
      }
      setError(
        status === 409
          ? "This booking could not be completed. The room may no longer be available, or this attempt conflicts with an earlier request. Please search again."
          : errorMessage(e),
      );
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="container page narrow">
      <Link
        className="back-link"
        to={"/hotels/" + intent.hotelId + "?" + queryString(intent)}
      >
        ← Back to rooms
      </Link>
      <div className="eyebrow">ONE STEP CLOSER</div>
      <h1>Review your stay.</h1>
      <p className="lead">A few details, then you're on your way.</p>
      {invalid ? (
        <Feedback>{invalid}</Feedback>
      ) : previous ? (
        <div className="panel">
          <h2>You have an unfinished booking attempt.</h2>
          <p>
            It may already have succeeded. Review your bookings before starting
            another request.
          </p>
          <div className="actions">
            <Link
              className="button"
              to={"/book?" + queryString(attempt.intent)}
              reloadDocument
            >
              Return to previous attempt
            </Link>
            <Link className="button secondary" to="/bookings">
              My bookings
            </Link>
            <button
              className="text-button"
              onClick={() => {
                setAttempt(createAttempt(user!.id, intent));
                setDefinitive(false);
                setError("");
              }}
            >
              Intentionally start a new attempt
            </button>
          </div>
        </div>
      ) : data.loading ? (
        <Loading text="Checking your stay details…" />
      ) : data.error ? (
        <Feedback>{data.error}</Feedback>
      ) : data.data ? (
        <div className="panel booking-review">
          <div className="eyebrow">{data.data.hotel.location}</div>
          <h2>{data.data.hotel.name}</h2>
          <p>
            {data.data.category
              ? roomLabel(data.data.category.roomType)
              : "Room category #" + intent.roomCategoryId}
          </p>
          <dl className="summary-grid">
            <Detail label="Check-in">{dateLabel(intent.checkIn)}</Detail>
            <Detail label="Check-out">{dateLabel(intent.checkOut)}</Detail>
            <Detail label="Rooms">{intent.numberOfRooms}</Detail>
            <Detail label="Guests">{intent.totalGuests}</Detail>
          </dl>
          {data.data.category && (
            <div className="total-line">
              <span>Estimated total</span>
              <strong>{money(data.data.category.estimatedTotalAmount)}</strong>
            </div>
          )}
          <p className="muted small-text">
            The final price and room allocation are confirmed by the booking
            service. No payment is collected.
          </p>
          {!data.data.category?.isAvailable && !attempt?.submitted && (
            <Feedback>
              The selected room is no longer available for these dates. Please
              search again.
            </Feedback>
          )}
          {error && <Feedback>{error}</Feedback>}
          {attempt?.submitted && !definitive && !busy && (
            <p className="muted">
              This attempt is saved. Retrying uses the same request key, even
              after a page refresh. You can also check My bookings.
            </p>
          )}
          <div className="actions">
            <button
              className="button"
              disabled={
                busy ||
                definitive ||
                (!data.data.category?.isAvailable && !attempt?.submitted)
              }
              onClick={submit}
            >
              {busy
                ? "Creating booking…"
                : attempt?.submitted
                  ? "Retry this booking"
                  : "Confirm booking →"}
            </button>
            <Link
              className="button secondary"
              to={
                definitive
                  ? "/hotels/" + intent.hotelId + "?" + queryString(intent)
                  : "/bookings"
              }
            >
              {definitive ? "Search again" : "My bookings"}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
function BookingFacts({ booking }: { booking: Booking }) {
  return (
    <dl className="summary-grid">
      <Detail label="Check-in">
        {booking.checkIn ? dateLabel(booking.checkIn) : "Not recorded"}
      </Detail>
      <Detail label="Check-out">
        {booking.checkOut ? dateLabel(booking.checkOut) : "Not recorded"}
      </Detail>
      <Detail label="Rooms / guests">
        {booking.numberOfRooms ?? "—"} / {booking.totalGuests}
      </Detail>
      <Detail label="Final amount">
        {money(Number(booking.bookingAmount))}
      </Detail>
    </dl>
  );
}
export function CancelDialog({
  booking,
  onClose,
  onDone,
}: {
  booking: Booking;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function cancel() {
    setBusy(true);
    try {
      await bookingsApi.cancel(booking.id);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Cancel this booking?"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p>Are you sure you want to cancel this booking?</p>
      <p className="muted">
        Booking #{booking.id}. Your allocated rooms will be released.
      </p>
      {error && <Feedback>{error}</Feedback>}
      <div className="actions">
        <button className="button secondary" onClick={onClose} disabled={busy}>
          Keep booking
        </button>
        <button className="button danger" onClick={cancel} disabled={busy}>
          {busy ? "Cancelling…" : "Yes, cancel booking"}
        </button>
      </div>
    </Modal>
  );
}
export function Bookings({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);
  const [cancel, setCancel] = useState<Booking | null>(null);
  const [success, setSuccess] = useState("");
  const data = useLoad(
    async () => ({
      bookings: await bookingsApi.list(offset),
      hotels: await hotelsApi.list().catch(() => []),
    }),
    user!.id + ":" + offset,
  );
  return (
    <div className="container page">
      {admin && (
        <Link className="back-link" to="/admin">
          ← Admin dashboard
        </Link>
      )}
      <div className="eyebrow">
        {admin ? "ADMINISTRATION" : "YOUR TRAVEL NOTEBOOK"}
      </div>
      <h1>{admin ? "All bookings." : "Your stays, all here."}</h1>
      <p className="lead">
        {admin
          ? "Bookings across the application, using your administrator access."
          : "Upcoming plans and places you have made your own."}
      </p>
      {success && <Feedback success>{success}</Feedback>}
      {data.loading ? (
        <Loading text="Loading bookings…" />
      ) : data.error ? (
        <Feedback>{data.error}</Feedback>
      ) : !data.data?.bookings.length ? (
        <Empty
          title={
            offset ? "No more bookings." : "You haven't made any bookings yet."
          }
        >
          <Link className="button" to="/hotels">
            Browse hotels →
          </Link>
        </Empty>
      ) : (
        <div className="booking-list">
          {data.data.bookings.map((b) => (
            <article className="booking-card" key={b.id}>
              <div className="booking-card-heading">
                <div>
                  <span className="eyebrow">BOOKING #{b.id}</span>
                  <h2>
                    {data.data?.hotels.find((h) => h.id === b.hotelId)?.name ||
                      "Hotel #" + b.hotelId}
                  </h2>
                </div>
                <Status value={b.status} />
              </div>
              {admin && <p className="muted">{b.userEmail}</p>}
              <BookingFacts booking={b} />
              <div className="actions">
                <Link className="text-link" to={"/bookings/" + b.id}>
                  View booking ↗
                </Link>
                {b.status === "CONFIRMED" && (
                  <button
                    className="text-button danger-text"
                    onClick={() => setCancel(b)}
                  >
                    Cancel booking
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="pagination">
        {(offset > 0 || data.data?.bookings.length === 50) && (
          <>
            <button
              className="button secondary"
              disabled={!offset}
              onClick={() => setOffset(Math.max(0, offset - 50))}
            >
              Previous
            </button>
            <button
              className="button secondary"
              disabled={data.data?.bookings.length !== 50}
              onClick={() => setOffset(offset + 50)}
            >
              Next
            </button>
          </>
        )}
      </div>
      {cancel && (
        <CancelDialog
          booking={cancel}
          onClose={() => setCancel(null)}
          onDone={() => {
            setCancel(null);
            setSuccess("Booking cancelled. Your rooms have been released.");
            data.reload();
          }}
        />
      )}
    </div>
  );
}
export function BookingDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [cancel, setCancel] = useState(false);
  const [success, setSuccess] = useState("");
  const data = useLoad(
    async () => {
      const booking = await bookingsApi.get(Number(id));
      const [hotel, categories] = await Promise.all([
        hotelsApi.get(booking.hotelId).catch(() => null),
        hotelsApi.categories(booking.hotelId).catch(() => []),
      ]);
      return {
        booking,
        hotel,
        category: categories.find((c) => c.id === booking.roomCategoryId),
      };
    },
    user!.id + ":" + id,
  );
  if (data.loading) return <Loading text="Loading your booking…" />;
  if (data.error || !data.data)
    return (
      <div className="container page">
        <Feedback>{data.error || "Booking not found."}</Feedback>
      </div>
    );
  const { booking, hotel, category } = data.data;
  const confirmed = params.has("confirmed") && booking.status === "CONFIRMED";
  return (
    <div className="container page narrow">
      <Link to="/bookings" className="back-link">
        ← My bookings
      </Link>
      {confirmed && <div className="confirmation-mark">✓</div>}
      <div className="eyebrow">
        {confirmed ? "YOUR NEXT CHAPTER IS BOOKED" : "BOOKING #" + booking.id}
      </div>
      <h1>{confirmed ? "You're all set." : "Your stay details."}</h1>
      {confirmed && (
        <p className="lead">A confirmation email has been queued.</p>
      )}
      {success && <Feedback success>{success}</Feedback>}
      <div className="panel">
        <div className="booking-card-heading">
          <div>
            <span className="eyebrow">BOOKING #{booking.id}</span>
            <h2>{hotel?.name || "Hotel #" + booking.hotelId}</h2>
            <p>
              {category
                ? roomLabel(category.roomType)
                : "Room category #" + (booking.roomCategoryId ?? "—")}
            </p>
          </div>
          <Status value={booking.status} />
        </div>
        <BookingFacts booking={booking} />
        {booking.allocatedRoomNos?.length ? (
          <div className="allocation">
            <span className="muted">Allocated room numbers</span>
            <strong>{booking.allocatedRoomNos.join(", ")}</strong>
          </div>
        ) : null}
        <div className="actions">
          <Link className="button" to="/bookings">
            View my bookings →
          </Link>
          {booking.status === "CONFIRMED" && (
            <button
              className="button secondary"
              onClick={() => setCancel(true)}
            >
              Cancel booking
            </button>
          )}
        </div>
      </div>
      {cancel && (
        <CancelDialog
          booking={booking}
          onClose={() => setCancel(false)}
          onDone={() => {
            setCancel(false);
            setSuccess("Your booking has been cancelled.");
            data.reload();
          }}
        />
      )}
    </div>
  );
}
