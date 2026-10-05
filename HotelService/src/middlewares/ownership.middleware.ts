import { RequestHandler } from 'express';
import { HotelRepository } from '../repositories/hotel.repository';
import { Principal } from './auth.middleware';
import { BadRequestError, ForbiddenError } from '../utils/errors/app.error';

export const requireHotelOwner: RequestHandler = async (req, res, next) => {
  const hotelId = Number(req.params.hotelId || req.params.id);
  if (!Number.isSafeInteger(hotelId) || hotelId < 1) throw new BadRequestError('Invalid hotel ID');
  const hotel = await new HotelRepository().findById(hotelId);
  const user = res.locals.user as Principal;
  if (user.role !== 'ADMIN' && hotel.managerUserId !== user.userId) {
    throw new ForbiddenError('You do not manage this hotel');
  }
  next();
};
