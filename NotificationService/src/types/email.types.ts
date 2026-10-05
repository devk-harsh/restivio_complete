export interface EmailJobPayload {
    eventId?: string;
    bookingId?: number;
    correlationId?: string;
    to: string;
    subject: string;
    templateId: string; 
    params : Record<string, unknown>;
}
