import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
  useParams,
} from "react-router-dom";
import { hotelsApi } from "../api/hotels.api";
import { useLoad } from "../hooks/useLoad";
import {
  Empty,
  Feedback,
  HotelArt,
  HotelCard,
  Loading,
  StayForm,
} from "../components/UI";
import { queryString, readStay, stayError } from "../utils/stay";
import { money, roomLabel, dateLabel } from "../utils/format";
import { errorMessage } from "../utils/errors";
import type { Availability, Stay } from "../types/api";
export function Home() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [stay, setStay] = useState(() => readStay(params));
  const [error, setError] = useState("");
  const hotels = useLoad(hotelsApi.list, "hotels");
  return (
    <>
      <section className="container hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-line" /> MAKE YOURSELF AT HOME
          </div>
          <h1>
            A little room
            <br />
            to <em>unwind.</em>
          </h1>
          <p>
            A change of scenery. A comfortable room.
            <br />
            Find your next stay, and make it yours.
          </p>
          <a href="#find-stay" className="text-link">
            Your next chapter starts here <span>↓</span>
          </a>
        </div>
        <HotelArt hero />
        <div className="hero-note">
          <span>01 /</span> Somewhere new.
          <br />
          Something simple.
        </div>
      </section>
      <section className="container search-panel" id="find-stay">
        <div className="search-heading">
          <h2>Find your next stay</h2>
          <span>Good days start with a good stay.</span>
        </div>
        <StayForm
          value={stay}
          onChange={setStay}
          label="Explore hotels"
          onSubmit={() => {
            const issue = stayError(stay);
            setError(issue);
            if (!issue) navigate("/hotels?" + queryString(stay));
          }}
        />
        {error && <Feedback>{error}</Feedback>}
      </section>
      <section className="container section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE STAY COLLECTION</div>
            <h2>Somewhere you'd rather be.</h2>
          </div>
          <Link className="text-link" to="/hotels">
            View all hotels ↗
          </Link>
        </div>
        {hotels.loading ? (
          <Loading text="Finding your next stay…" />
        ) : hotels.error ? (
          <Feedback>{hotels.error}</Feedback>
        ) : !hotels.data?.length ? (
          <Empty title="New stays are on their way." />
        ) : (
          <div className="hotel-grid">
            {hotels.data.slice(0, 3).map((h) => (
              <HotelCard hotel={h} stay={stay} key={h.id} />
            ))}
          </div>
        )}
        <p className="asset-note">
          Our architectural illustrations set the mood; they are not photographs
          of the hotels.
        </p>
      </section>
      <section className="container intro-band">
        <span className="eyebrow">LESS PLANNING. MORE LIVING.</span>
        <h2>Your stay, made simple.</h2>
        <p>
          Explore hotels, check room availability, and keep your bookings in one
          place. All you need to do is decide where to go.
        </p>
        <Link to="/hotels" className="button light">
          Find a room ↗
        </Link>
      </section>
    </>
  );
}
export function HotelDetails() {
  const { id } = useParams();
  const hotelId = Number(id);
  const [params] = useSearchParams();
  const [stay, setStay] = useState(() => readStay(params));
  const [result, setResult] = useState<{
    availability: Availability;
    stay: Stay;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const data = useLoad(
    async () => ({
      hotel: await hotelsApi.get(hotelId),
      categories: await hotelsApi.categories(hotelId),
    }),
    id || "",
  );
  // Carry the chosen dates into this page and check them immediately.
  useEffect(() => {
    let active = true;
    const initial = readStay(params);
    setStay(initial);
    setResult(null);
    if (!params.has("checkIn") || stayError(initial)) return;
    setBusy(true);
    setError("");
    void hotelsApi
      .availability(hotelId, initial)
      .then((availability) => {
        if (active) setResult({ availability, stay: initial });
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [hotelId]);
  async function search() {
    const issue = stayError(stay);
    setError(issue);
    if (issue) return;
    setBusy(true);
    setResult(null);
    try {
      const snapshot = { ...stay };
      setResult({
        availability: await hotelsApi.availability(hotelId, snapshot),
        stay: snapshot,
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (data.loading) return <Loading text="Getting the hotel ready…" />;
  if (data.error || !data.data)
    return (
      <div className="container page">
        <Feedback>{data.error || "Hotel not found."}</Feedback>
      </div>
    );
  const { hotel, categories } = data.data;
  return (
    <div className="container page">
      <Link className="back-link" to={"/hotels?" + queryString(stay)}>
        ← All hotels
      </Link>
      <div className="detail-heading">
        <div>
          <div className="eyebrow">{hotel.location}</div>
          <h1>{hotel.name}</h1>
          <p className="lead">{hotel.address}</p>
          {hotel.rating !== null && (
            <span className="rating">
              ★ {hotel.rating}{" "}
              {hotel.ratingCount !== null &&
                "· " + hotel.ratingCount + " ratings"}
            </span>
          )}
        </div>
        <HotelArt variant={hotel.id} />
      </div>
      <section className="panel">
        <div className="section-heading compact">
          <h2>Check rooms for your stay</h2>
          <span className="muted">1–30 nights</span>
        </div>
        <StayForm
          value={stay}
          onChange={setStay}
          onSubmit={search}
          busy={busy}
        />
        {error && <Feedback>{error}</Feedback>}
      </section>
      <section className="section">
        <div className="section-heading">
          <div className="eyebrow">A ROOM FOR YOU</div>
          <h2>
            {result ? "Available for your dates" : "Explore room categories"}
          </h2>
        </div>
        {result ? (
          <>
            <p className="muted">
              {dateLabel(result.stay.checkIn)} →{" "}
              {dateLabel(result.stay.checkOut)} · {result.stay.numberOfRooms}{" "}
              room(s) · {result.stay.totalGuests} guest(s)
            </p>
            {!result.availability.categories.some((c) => c.isAvailable) && (
              <Empty title="No rooms are available for your selected dates.">
                <p>
                  Change your dates or the number of rooms and search again.
                </p>
              </Empty>
            )}
            <div className="room-grid">
              {result.availability.categories.map((c) => (
                <article
                  className={
                    "room-card " + (!c.isAvailable ? "unavailable" : "")
                  }
                  key={c.roomCategoryId}
                >
                  <span className="room-icon">⌑</span>
                  <h3>{roomLabel(c.roomType)}</h3>
                  <p>
                    {c.availableRoomCount} room(s) available for the entire stay
                  </p>
                  <div className="price">
                    {money(c.pricePerNight)} <small>/ room / night</small>
                  </div>
                  <div className="estimate">
                    Estimated stay total{" "}
                    <strong>{money(c.estimatedTotalAmount)}</strong>
                  </div>
                  {c.isAvailable ? (
                    <Link
                      className="button full"
                      to={
                        "/book?" +
                        queryString({
                          ...result.stay,
                          hotelId,
                          roomCategoryId: c.roomCategoryId,
                        })
                      }
                    >
                      Book this room →
                    </Link>
                  ) : (
                    <span className="badge cancelled">Unavailable</span>
                  )}
                </article>
              ))}
            </div>
            <p className="asset-note">
              Estimates are provided by the hotel. The booking service confirms
              the final amount and allocation.
            </p>
          </>
        ) : categories.length ? (
          <div className="room-grid">
            {categories.map((c) => (
              <article className="room-card" key={c.id}>
                <span className="room-icon">⌑</span>
                <h3>{roomLabel(c.roomType)}</h3>
                <div className="price">
                  {money(c.price)} <small>/ room / night</small>
                </div>
                <p>Choose your dates above to check availability.</p>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="Rooms are not listed yet.">
            <p>Please check back for available categories.</p>
          </Empty>
        )}
      </section>
    </div>
  );
}
