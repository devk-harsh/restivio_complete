import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./layouts/Layout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { Home, HotelDetails } from "./pages/Hotels";
import { Hotels } from "./pages/HotelCollection";
import { AuthPage } from "./pages/Auth";
import { BookingReview, Bookings, BookingDetails } from "./pages/Bookings";
import { Manager } from "./pages/Manager";
import { Empty } from "./components/UI";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="hotels" element={<Hotels />} />
          <Route path="hotels/:id" element={<HotelDetails />} />
          <Route path="login" element={<AuthPage />} />
          <Route path="register" element={<AuthPage register />} />
          <Route element={<ProtectedRoute />}>
            <Route path="book" element={<BookingReview />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="bookings/:id" element={<BookingDetails />} />
          </Route>
          <Route element={<ProtectedRoute roles={["HOTEL_MANAGER"]} />}>
            <Route path="manager" element={<Manager />} />
          </Route>
          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="admin" element={<Manager admin />} />
            <Route path="admin/bookings" element={<Bookings admin />} />
          </Route>
          <Route
            path="*"
            element={
              <div className="container page">
                <Empty title="This page wandered off.">
                  <Link className="button" to="/">
                    Back home
                  </Link>
                </Empty>
              </div>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  </BrowserRouter>,
);
