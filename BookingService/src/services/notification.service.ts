import axios from 'axios';
import { serverConfig } from '../config';
import OutboxEvent from '../db/models/outboxEvent';
// Only the durable outbox dispatcher calls this, never booking controllers.
export async function deliverBookingEvent(event: OutboxEvent) {
  await axios.post(serverConfig.NOTIFICATION_SERVICE_URL + '/api/v1/internal/events', {
    eventId: event.id, type: event.eventType, payload: event.payload, correlationId: event.correlationId,
  }, { timeout: 5000, headers: {
    'X-Internal-Service-Key': process.env.INTERNAL_SERVICE_KEY,
    'X-Correlation-ID': event.correlationId,
  } });
}
