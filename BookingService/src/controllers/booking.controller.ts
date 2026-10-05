import { Request, Response } from 'express';
import { createBookingService, getBookingByIdService, listBookingsService, cancelBookingService } from '../services/booking.service';
import { createBookingSchema, idempotencyKeySchema } from '../validators/booking.validator';
import { BadRequestError } from '../utils/errors/app.error';
export async function createBookingHandler(req: Request, res: Response) {
  const key = idempotencyKeySchema.safeParse(req.get('Idempotency-Key'));
  const body = createBookingSchema.safeParse(req.body);
  if (!key.success || !body.success) throw new BadRequestError('Valid booking intent and Idempotency-Key header required');
  const result = await createBookingService(body.data, res.locals.user, key.data);
  if (result.replayed) res.set('Idempotency-Replayed', 'true');
  res.status(result.status).json(result.body);
}
export async function getBookingByIdHandler(req: Request, res: Response) {
  res.json({ success: true, data: await getBookingByIdService(Number(req.params.id), res.locals.user) });
}
export async function listBookingsHandler(req: Request, res: Response) {
  const offset = Number(req.query.offset || 0);
  if (!Number.isSafeInteger(offset) || offset < 0) throw new BadRequestError('Invalid offset');
  res.json({ success: true, data: await listBookingsService(res.locals.user, offset) });
}
export async function cancelBookingHandler(req: Request, res: Response) {
  res.json({ success: true, data: await cancelBookingService(Number(req.params.id), res.locals.user) });
}
