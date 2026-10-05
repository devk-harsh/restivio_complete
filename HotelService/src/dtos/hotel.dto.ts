export type createHotelDTO = {
  managerUserId: number;
  name: string;
  address: string;
  location: string;
  rating?: number;
  ratingCount?: number;
};

export type updateHotelDTO = {
  name?: string;
  address?: string;
  location?: string;
  rating?: number;
  ratingCount?: number;
};
