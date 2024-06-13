import { Controller } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { GrpcMethod } from '@nestjs/microservices';
import { Bookings, createBookingResponse, inputCreateBooking, inputFindOneBooking } from './bookings.pb';

@Controller('bookings')
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) {}

    @GrpcMethod('BookingsService', 'create')
    async createBooking(data: inputCreateBooking): Promise<createBookingResponse> {
        return this.bookingsService.createBooking(data);
    }

    @GrpcMethod('BookingsService', 'findOne')
   async findOne(data: inputFindOneBooking): Promise<Bookings> {
        return this.bookingsService.findOne(data);
    }
    
    

}
