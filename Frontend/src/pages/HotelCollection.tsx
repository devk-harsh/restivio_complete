import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { hotelsApi } from "../api/hotels.api";
import { useLoad } from "../hooks/useLoad";
import {
  Empty,
  Feedback,
  HotelCard,
  Loading,
  StayForm,
} from "../components/UI";
import { readStay, stayError, queryString } from "../utils/stay";
import { dateLabel } from "../utils/format";
import { errorMessage } from "../utils/errors";
import type { Availability, Stay } from "../types/api";

type SearchResult = { availability?: Availability; error?: string };
export function Hotels() {
  const [params, setParams] = useSearchParams();
  const [stay, setStay] = useState(() => readStay(params));
  const [applied, setApplied] = useState<Stay | null>(() =>
    params.has("checkIn") && !stayError(readStay(params))
      ? readStay(params)
      : null,
  );
  const [results, setResults] = useState<Record<number, SearchResult>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState("");
  const [page, setPage] = useState(0);
  const hotels = useLoad(hotelsApi.list, "hotels");
  useEffect(() => {
    let active = true;
    if (!applied || !hotels.data) return;
    setBusy(true);
    setResults({});
    const searchStay = applied;
    const pending = [...hotels.data];
    const found: Record<number, SearchResult> = {};
    // Reuse the existing per-hotel availability API, with at most four concurrent calls.
    async function worker() {
      while (pending.length) {
        const hotel = pending.shift()!;
        try {
          found[hotel.id] = {
            availability: await hotelsApi.availability(hotel.id, searchStay),
          };
        } catch (e) {
          found[hotel.id] = { error: errorMessage(e) };
        }
      }
    }
    void Promise.all(
      Array.from({ length: Math.min(4, pending.length) }, worker),
    ).then(() => {
      if (active) {
        setResults(found);
        setBusy(false);
      }
    });
    return () => {
      active = false;
    };
  }, [applied, hotels.data]);
  const locations = [
    ...new Set(hotels.data?.map((h) => h.location) || []),
  ].sort();
  const visible = (hotels.data || []).filter(
    (h) => !location || h.location === location,
  );
  const searched = applied && !busy && Object.keys(results).length > 0;
  const availableCount = visible.filter((h) =>
    results[h.id]?.availability?.categories.some((c) => c.isAvailable),
  ).length;
  return (
    <div className="container page collection-page">
      <div className="eyebrow">BOOK YOUR NEXT STAY</div>
      <h1>Where would you like to stay?</h1>
      <p className="lead">
        Choose your dates, compare available rooms, and book in a few simple
        steps.
      </p>
      <ol className="booking-steps" aria-label="Booking steps">
        <li className="current">
          <span>1</span> Find a hotel
        </li>
        <li>
          <span>2</span> Choose a room
        </li>
        <li>
          <span>3</span> Confirm your stay
        </li>
      </ol>
      <section
        className="panel collection-search"
        aria-label="Find available rooms"
      >
        <div className="section-heading compact">
          <h2>Your travel dates</h2>
          <span className="muted">
            Browse first. Log in when you're ready to book.
          </span>
        </div>
        <StayForm
          value={stay}
          onChange={setStay}
          busy={busy}
          label="Find available rooms"
          onSubmit={() => {
            const issue = stayError(stay);
            setError(issue);
            if (issue) return;
            setParams(queryString(stay), { replace: true });
            setApplied({ ...stay });
            setPage(0);
          }}
        />
        {error && <Feedback>{error}</Feedback>}
      </section>
      <div className="collection-toolbar">
        <div>
          <h2>{searched ? "Rooms for your trip" : "Explore hotels"}</h2>
          <p className="muted">
            {searched
              ? `${dateLabel(applied!.checkIn)} – ${dateLabel(applied!.checkOut)} · ${applied!.numberOfRooms} room(s) · ${applied!.totalGuests} guest(s)`
              : "Nightly prices come directly from each hotel."}
          </p>
        </div>
        <label>
          Location
          <select
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All locations</option>
            {locations.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </label>
      </div>
      {hotels.loading ? (
        <Loading text="Loading hotels…" />
      ) : hotels.error ? (
        <Feedback>{hotels.error}</Feedback>
      ) : busy ? (
        <Loading text="Checking real room availability for your dates…" />
      ) : !visible.length ? (
        <Empty title="No hotels in this collection yet." />
      ) : (
        <>
          {searched && (
            <p className="results-count" role="status">
              {availableCount} of {visible.length} hotels have rooms for your
              stay.
              {availableCount === 0
                ? " Try different dates or fewer rooms."
                : ""}
            </p>
          )}
          <div className="hotel-grid">
            {visible.slice(page * 9, page * 9 + 9).map((h) => (
              <HotelCard
                key={h.id}
                hotel={h}
                stay={applied || stay}
                availability={
                  searched ? results[h.id]?.availability : undefined
                }
                availabilityError={searched ? results[h.id]?.error : undefined}
              />
            ))}
          </div>
          {visible.length > 9 && (
            <div className="pagination">
              <button
                className="button secondary"
                disabled={!page}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page + 1} of {Math.ceil(visible.length / 9)}
              </span>
              <button
                className="button secondary"
                disabled={(page + 1) * 9 >= visible.length}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
      <p className="asset-note">
        Filter locations within the loaded collection. Illustrations are
        decorative; prices and availability are live.
      </p>
    </div>
  );
}
