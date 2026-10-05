import { Router } from 'express';
import { requireInternalKey } from '../../middlewares/auth.middleware';
import { bookingEventSchema } from '../../validators/event.validator';
import { eventToEmail } from '../../services/event.service';
import { addEmailToQueue } from '../../producers/email.producer';
import logger from '../../config/logger.config';
const router = Router();
router.use(requireInternalKey);
router.post('/', async (req, res) => {
  const parsed = bookingEventSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, message: 'Invalid booking event' }); return; }
  const job = await addEmailToQueue(eventToEmail(parsed.data));
  logger.info('Booking event accepted', { eventId: parsed.data.eventId, bookingId: parsed.data.payload.bookingId });
  res.status(202).json({ success: true, data: { jobId: job.id } });
});
export default router;
