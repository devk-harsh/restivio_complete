import { Router } from "express";
import { requireInternalKey } from '../../middlewares/auth.middleware';
import { queueEmailNotificationHandler } from "../../controllers/notification.controller";
import { validateRequestBody } from "../../validators";
import { queueEmailNotificationSchema } from "../../validators/notification.validator";
const notificationRouter = Router();
notificationRouter.use(requireInternalKey);

notificationRouter.post("/email", validateRequestBody(queueEmailNotificationSchema), queueEmailNotificationHandler);
export default notificationRouter;
