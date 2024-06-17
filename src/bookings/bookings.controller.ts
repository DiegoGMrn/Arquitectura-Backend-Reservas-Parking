import { Controller } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { GrpcMethod } from '@nestjs/microservices';
import { Bookings, Empty, arrayBookings, createBookingResponse, inputCreateBooking, inputFindOneBooking } from './bookings.pb';

@Controller('bookings')
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) {}

    @GrpcMethod('BookingsService', 'create')
    async createBooking(data: inputCreateBooking): Promise<createBookingResponse> {
        return this.bookingsService.createBooking(data);
    }

    @GrpcMethod('BookingsService', 'findOne')
   async findOne(data: inputFindOneBooking): Promise<Bookings> {
        const response = await this.bookingsService.findOne(data);
        return response;
    }

    @GrpcMethod('BookingsService', 'findAll')
    async findAll(_: Empty): Promise<arrayBookings> {
        const response: arrayBookings = await this.bookingsService.findAll();
        return response;
    }

    @GrpcMethod('BookingsService', 'findAllByUser')
    async findAllByUser(data: inputFindOneBooking): Promise<arrayBookings> {
        const response = await this.bookingsService.findAllByUser(data);
        return response;
    }

}
