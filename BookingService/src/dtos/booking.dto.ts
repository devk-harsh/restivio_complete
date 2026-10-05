export type CreateBookingDTO = {
  hotelId: number;
  roomCategoryId: number;
  checkIn: string;
  checkOut: string;
  numberOfRooms: number;
  totalGuests: number;
};
