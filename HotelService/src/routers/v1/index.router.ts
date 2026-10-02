import express from 'express';
import pingRouter from './ping.router';
import hotelRouter from './hotel.router';
import internalRoomRouter from "./internalRoom.router";

const v1Router = express.Router();

v1Router.use('/ping',  pingRouter);
v1Router.use('/hotels',  hotelRouter);

v1Router.use("/internal/rooms",internalRoomRouter);

export default v1Router;
