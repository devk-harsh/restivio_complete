export type Role = "USER" | "HOTEL_MANAGER" | "ADMIN";
export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}
export interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}
export interface Session {
  accessToken: string;
  expiresIn: number;
  user: User;
}
export interface Hotel {
  id: number;
  name: string;
  address: string;
  location: string;
  managerUserId: number | null;
  rating: number | string | null;
  ratingCount: number | null;
}
export type HotelInput = Pick<Hotel, "name" | "address" | "location">;
export type RoomType = "SINGLE" | "DOUBLE" | "FAMILY" | "DELUXE" | "SUITE";
export interface RoomCategory {
  id: number;
  hotelId: number;
  roomType: RoomType;
  price: number;
  roomCount: number;
}
export type CategoryInput = Pick<
  RoomCategory,
  "roomType" | "price" | "roomCount"
>;
export interface Stay {
  checkIn: string;
  checkOut: string;
  numberOfRooms: number;
  totalGuests: number;
}
export interface AvailabilityCategory {
  roomCategoryId: number;
  roomType: RoomType;
  pricePerNight: number;
  availableRoomCount: number;
  requestedRooms: number;
  isAvailable: boolean;
  estimatedTotalAmount: number;
}
export interface Availability {
  hotelId: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  requestedRooms: number;
  categories: AvailabilityCategory[];
}
export interface BookingIntent extends Stay {
  hotelId: number;
  roomCategoryId: number;
}
export interface Booking {
  id: number;
  userId: number;
  userEmail: string;
  hotelId: number;
  roomCategoryId: number | null;
  checkIn: string | null;
  checkOut: string | null;
  numberOfRooms: number | null;
  allocatedRoomNos: number[] | null;
  totalGuests: number;
  bookingAmount: number | string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  createdAt: string;
}
export interface InventoryResult {
  datesProcessed: number;
  createdRows: number;
  existingRowsSkipped: number;
  expectedRows: number;
}
