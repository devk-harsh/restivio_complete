import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { hotelsApi } from "../api/hotels.api";
import { useAuth } from "../context/AuthContext";
import { useLoad } from "../hooks/useLoad";
import { Empty, Feedback, Loading, Modal } from "../components/UI";
import { dateAfter, money, roomLabel } from "../utils/format";
import { errorMessage } from "../utils/errors";
import type { Hotel, RoomCategory, RoomType } from "../types/api";
const roomTypes: RoomType[] = ["SINGLE", "DOUBLE", "FAMILY", "DELUXE", "SUITE"];
export function Manager({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const data = useLoad(hotelsApi.list, user!.id + ":hotels");
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState<Hotel | "new" | null>(null);
  const [deleting, setDeleting] = useState<Hotel | null>(null);
  const [success, setSuccess] = useState("");
  const hotels =
    data.data?.filter((h) => admin || h.managerUserId === user!.id) || [];
  const active = hotels.find((h) => h.id === selected) || hotels[0];
  return (
    <div className="container page">
      <div className="dashboard-title">
        <div>
          <div className="eyebrow">
            {admin ? "ADMINISTRATION" : "YOUR HOSTING SPACE"}
          </div>
          <h1>{admin ? "The bigger picture." : "Welcome back, host."}</h1>
          <p className="lead">
            {admin
              ? "Manage hotels and inspect bookings with existing administrator permissions."
              : "A thoughtful stay starts with the details."}
          </p>
        </div>
        <div className="actions">
          {admin && (
            <Link className="button secondary" to="/admin/bookings">
              View all bookings ↗
            </Link>
          )}
          <button className="button" onClick={() => setEditing("new")}>
            + Create hotel
          </button>
        </div>
      </div>
      {success && <Feedback success>{success}</Feedback>}
      {data.loading ? (
        <Loading text="Loading your hotels…" />
      ) : data.error ? (
        <Feedback>{data.error}</Feedback>
      ) : !hotels.length ? (
        <Empty title="You haven't created a hotel yet.">
          <p>
            Add your property, create room categories, and generate inventory to
            welcome your first guests.
          </p>
          <button className="button" onClick={() => setEditing("new")}>
            Create hotel →
          </button>
        </Empty>
      ) : (
        <>
          <div className="dashboard-selector">
            <label>
              {admin ? "Select hotel" : "Your hotels"}
              <select
                value={active.id}
                onChange={(e) => setSelected(Number(e.target.value))}
              >
                {hotels.map((h) => (
                  <option value={h.id} key={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
            <span className="muted">
              {hotels.length} {admin ? "active" : "owned"} hotel(s)
            </span>
          </div>
          <div className="panel property-panel">
            <div>
              <span className="eyebrow">MY HOTEL · #{active.id}</span>
              <h2>{active.name}</h2>
              <p>
                {active.address} · {active.location}
              </p>
            </div>
            <div className="actions">
              <Link className="button secondary" to={"/hotels/" + active.id}>
                View availability ↗
              </Link>
              <button
                className="button secondary"
                onClick={() => setEditing(active)}
              >
                Edit hotel
              </button>
              <button
                className="text-button danger-text"
                onClick={() => setDeleting(active)}
              >
                Delete hotel
              </button>
            </div>
          </div>
          <HotelManagement key={active.id} hotel={active} />
        </>
      )}
      {editing && (
        <HotelForm
          hotel={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onDone={(h) => {
            setEditing(null);
            setSelected(h.id);
            setSuccess("Hotel saved.");
            data.reload();
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          title="Delete this hotel?"
          description={
            "Remove " +
            deleting.name +
            " from the hotel collection? This soft-deletes the hotel."
          }
          action={() => hotelsApi.remove(deleting.id)}
          onClose={() => setDeleting(null)}
          onDone={() => {
            setDeleting(null);
            setSelected(null);
            setSuccess("Hotel removed from the collection.");
            data.reload();
          }}
        />
      )}
    </div>
  );
}
function HotelForm({
  hotel,
  onClose,
  onDone,
}: {
  hotel?: Hotel;
  onClose: () => void;
  onDone: (h: Hotel) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const input = {
      name: String(form.get("name")).trim(),
      address: String(form.get("address")).trim(),
      location: String(form.get("location")).trim(),
    };
    try {
      onDone(
        hotel
          ? await hotelsApi.update(hotel.id, input)
          : await hotelsApi.create(input),
      );
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <Modal
      title={hotel ? "Edit hotel" : "Create your hotel"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="form-stack" onSubmit={submit}>
        <label>
          Hotel name
          <input
            name="name"
            required
            maxLength={255}
            defaultValue={hotel?.name}
          />
        </label>
        <label>
          Address
          <input
            name="address"
            required
            maxLength={255}
            defaultValue={hotel?.address}
          />
        </label>
        <label>
          Location
          <input
            name="location"
            required
            maxLength={255}
            defaultValue={hotel?.location}
            placeholder="City or area"
          />
        </label>
        {error && <Feedback>{error}</Feedback>}
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save hotel"}
        </button>
      </form>
    </Modal>
  );
}
function HotelManagement({ hotel }: { hotel: Hotel }) {
  const categories = useLoad(
    () => hotelsApi.categories(hotel.id),
    String(hotel.id),
  );
  const [editing, setEditing] = useState<RoomCategory | "new" | null>(null);
  const [deleting, setDeleting] = useState<RoomCategory | null>(null);
  const [success, setSuccess] = useState("");
  return (
    <>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE ROOMS</span>
            <h2>Room categories</h2>
          </div>
          <button
            className="button secondary"
            onClick={() => setEditing("new")}
          >
            + Add category
          </button>
        </div>
        {success && <Feedback success>{success}</Feedback>}
        {categories.loading ? (
          <Loading text="Loading categories…" />
        ) : categories.error ? (
          <Feedback>{categories.error}</Feedback>
        ) : !categories.data?.length ? (
          <Empty title="Make room for your guests.">
            <p>Add a room category to set prices and room counts.</p>
          </Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Room category</th>
                  <th>Nightly price</th>
                  <th>Room count</th>
                  <th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {categories.data.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{roomLabel(c.roomType)}</strong>
                      <small>Category #{c.id}</small>
                    </td>
                    <td>{money(c.price)}</td>
                    <td>{c.roomCount}</td>
                    <td>
                      <div className="actions">
                        <button
                          className="text-button"
                          onClick={() => setEditing(c)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-button danger-text"
                          onClick={() => setDeleting(c)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Inventory hotel={hotel} categories={categories.data || []} />
      {editing && (
        <CategoryForm
          hotelId={hotel.id}
          category={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            setSuccess("Room category saved.");
            categories.reload();
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          title="Delete room category?"
          description="Categories with generated inventory cannot be deleted. The hotel service will check this before making a change."
          action={() => hotelsApi.removeCategory(hotel.id, deleting.id)}
          onClose={() => setDeleting(null)}
          onDone={() => {
            setDeleting(null);
            setSuccess("Room category deleted.");
            categories.reload();
          }}
        />
      )}
    </>
  );
}
function CategoryForm({
  hotelId,
  category,
  onClose,
  onDone,
}: {
  hotelId: number;
  category?: RoomCategory;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const input = {
      price: Number(form.get("price")),
      roomCount: Number(form.get("roomCount")),
    };
    try {
      if (category) await hotelsApi.updateCategory(hotelId, category.id, input);
      else
        await hotelsApi.addCategory(hotelId, {
          ...input,
          roomType: String(form.get("roomType")) as RoomType,
        });
      onDone();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <Modal
      title={category ? "Edit room category" : "Add room category"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="form-stack" onSubmit={submit}>
        <label>
          Room type
          <select
            name="roomType"
            defaultValue={category?.roomType || "DOUBLE"}
            disabled={!!category}
          >
            {roomTypes.map((type) => (
              <option key={type} value={type}>
                {roomLabel(type)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Price per room per night (₹)
          <input
            name="price"
            type="number"
            required
            min="1"
            step="1"
            defaultValue={category?.price}
          />
        </label>
        <label>
          Number of rooms
          <input
            name="roomCount"
            type="number"
            required
            min="1"
            step="1"
            defaultValue={category?.roomCount}
          />
        </label>
        <p className="muted small-text">
          Room type cannot be changed. Once inventory exists, its room count
          cannot be changed either.
        </p>
        {error && <Feedback>{error}</Feedback>}
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save category"}
        </button>
      </form>
    </Modal>
  );
}
function Inventory({
  hotel,
  categories,
}: {
  hotel: Hotel;
  categories: RoomCategory[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    const startDate = String(values.get("startDate"));
    const endDate = String(values.get("endDate"));
    const days = (Date.parse(endDate) - Date.parse(startDate)) / 86400000 + 1;
    setError("");
    setSuccess("");
    if (days < 1 || days > 366) {
      setError("Choose an inclusive inventory period of 1–366 days.");
      return;
    }
    setBusy(true);
    try {
      const result = await hotelsApi.generate(
        hotel.id,
        Number(values.get("category")),
        startDate,
        endDate,
      );
      setSuccess(
        "Inventory ready: " +
          result.createdRows +
          " room-night rows created across " +
          result.datesProcessed +
          " days. " +
          result.existingRowsSkipped +
          " existing rows kept.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel inventory-panel">
      <div>
        <span className="eyebrow">OPEN YOUR DOORS</span>
        <h2>Make rooms bookable.</h2>
        <p>
          Generate one inventory row per room for each night in this period.
          Both dates are included. Existing inventory is kept.
        </p>
        <Link className="text-link" to={"/hotels/" + hotel.id}>
          Inspect hotel availability ↗
        </Link>
      </div>
      <form className="form-stack" onSubmit={submit}>
        <label>
          Room category
          <select required name="category" defaultValue="">
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((c) => (
              <option value={c.id} key={c.id}>
                {roomLabel(c.roomType)} · {c.roomCount} rooms
              </option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label>
            Start date
            <input
              name="startDate"
              type="date"
              required
              defaultValue={dateAfter(0)}
            />
          </label>
          <label>
            End date (inclusive)
            <input
              name="endDate"
              type="date"
              required
              defaultValue={dateAfter(30)}
            />
          </label>
        </div>
        {error && <Feedback>{error}</Feedback>}
        {success && <Feedback success>{success}</Feedback>}
        <button className="button" disabled={busy || !categories.length}>
          {busy ? "Generating…" : "Generate inventory →"}
        </button>
      </form>
    </section>
  );
}
function DeleteDialog({
  title,
  description,
  action,
  onClose,
  onDone,
}: {
  title: string;
  description: string;
  action: () => Promise<void>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={title}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p>{description}</p>
      {error && <Feedback>{error}</Feedback>}
      <div className="actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Keep it
        </button>
        <button
          className="button danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await action();
              onDone();
            } catch (e) {
              setError(errorMessage(e));
              setBusy(false);
            }
          }}
        >
          {busy ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
}
