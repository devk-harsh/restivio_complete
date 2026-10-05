import { Request, Response, NextFunction } from "express";
import { createHotelService , getHotelByIdService, getAllHotelsService, deleteHotelService, updateHotelService} from "../services/hotel.service";
import { StatusCodes } from "http-status-codes";


export async function createHotelHandler(req: Request, res: Response, next: NextFunction) {

    // 1. Call service layer
    const hotelResponse = await createHotelService({ ...req.body, managerUserId: res.locals.user.userId });

    // 2. Send response
    res.status(StatusCodes.CREATED).json({
        message: "Hotel created successfully",
        data: hotelResponse,
        success: true,
    });
}

export async function getHotelByIdHandler(req: Request, res: Response, next: NextFunction) {
    // 1. Call service layer
    const hotelId = parseInt(req.params.id, 10);
    const hotelResponse = await getHotelByIdService(hotelId);
    // 2. Send response
    res.status(StatusCodes.OK).json({
        message: "Hotel retrieved successfully",
        data: hotelResponse,
        success: true,
    });
}

export async function getAllHotelsHandler(req: Request, res: Response, next: NextFunction) {
    // 1. Call service layer
    const hotelsResponse = await getAllHotelsService();
    // 2. Send response
    res.status(StatusCodes.OK).json({
        message: "Hotels retrieved successfully",
        data: hotelsResponse,
        success: true,
    });
}

export async function deleteHotelHandler(req: Request, res: Response, next: NextFunction) {
    // 1. Call service layer
    const hotelResponse = await deleteHotelService(Number(req.params.id));
    // 2. Send response
    res.status(StatusCodes.OK).json({
        message: "Hotel deleted successfully",
        data: hotelResponse,
        success: true,
    });
}

export async function updateHotelHandler(req: Request, res: Response, next: NextFunction) {
    // 1. Call service layer
    const hotelId = parseInt(req.params.id, 10);
    const hotelResponse = await updateHotelService(hotelId, req.body);
    // 2. Send response
    res.status(StatusCodes.OK).json({
        message: "Hotel updated successfully",
        data: hotelResponse,
        success: true,
    });
}
