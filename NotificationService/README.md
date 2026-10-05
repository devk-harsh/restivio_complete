# NotificationService

Restivio's BullMQ email service. It preserves the original Nodemailer/Handlebars
worker and confirmation/cancellation templates, with internal event ingestion,
event-ID job deduplication, exponential retries, retained failures and an email DLQ.

See the [root README](../README.md) for the working Compose setup, SMTP settings,
API documentation, tests and known delivery guarantees. Local API docs are at
[localhost:3003/docs](http://localhost:3003/docs); emails appear in
[MailHog](http://localhost:8025).
