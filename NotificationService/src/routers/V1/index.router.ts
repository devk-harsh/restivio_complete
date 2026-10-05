import express from "express";
import pingRouter from "./ping.router";
import notificationRouter from "./notification.router";
import eventRouter from './event.router';
const v1Router = express.Router();

v1Router.use('/ping', pingRouter);
v1Router.use('/notification', notificationRouter);
v1Router.use('/internal/events', eventRouter);

export default v1Router;
