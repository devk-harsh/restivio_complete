import { z } from "zod";

export const queueEmailNotificationSchema = z.object({
  to: z.email("Invalid recipient email address"),
  subject: z.string().trim().min(1, "Subject is required"),
  templateId: z.enum(['booking-confirmed', 'booking-cancelled']),
  params: z.record(z.string(), z.unknown()).optional().default({}),
});
