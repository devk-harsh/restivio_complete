import { Principal } from '../../middlewares/auth.middleware';
import { AppError, ForbiddenError } from '../errors/app.error';

export function authorizeBooking(booking: { userId: number }, user: Principal) {
  if (booking.userId !== user.userId && user.role !== 'ADMIN') throw new ForbiddenError('This booking belongs to another user');
}
export function cancellationAction(status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'): 'release' | 'noop' {
  if (status === 'CANCELLED') return 'noop';
  if (status !== 'CONFIRMED') throw new AppError('Only confirmed bookings can be cancelled', 409);
  return 'release';
}
