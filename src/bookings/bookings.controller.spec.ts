import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { of } from 'rxjs';
import {
  arrayBookings,
  checkOutBookingResponse,
  createBookingResponse,
  inputCheckOutBooking,
  inputCreateBooking,
  inputFindOneBooking,
} from './bookings.pb';
import { Bookings } from './entities/bookings.entity';

describe('BookingsController', () => {
  let controller: BookingsController;
  let service: BookingsService;

  const mockBookingsService = {
    createBooking: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAllByUser: jest.fn(),
    checkOut: jest.fn(),
    confirmBooking: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingsService,
          useValue: mockBookingsService,
        },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
    service = module.get<BookingsService>(BookingsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createBooking', () => {
    it('should create a booking', async () => {
      const bookingData: inputCreateBooking = {
        dateHourStart: '2024-06-23T10:00:00.000Z',
        idZone: 1,
        idUser: 1,
        patente: 'ABC123',
      };
      const expectedResponse: createBookingResponse = { success: true };

      jest.spyOn(service, 'createBooking').mockResolvedValue(expectedResponse);

      const result = await controller.createBooking(bookingData);

      expect(result).toEqual(expectedResponse);
      expect(service.createBooking).toHaveBeenCalledWith(bookingData);
    });
  });

  describe('findOne', () => {
    it('should find one booking', async () => {
      const bookingData: inputFindOneBooking = { id: 1 };
      const expectedResponse: Bookings = {
        id: 1,
        dateHourStart: new Date(),
        idZone: 1,
        idUser: 1,
        patente: 'ABC123',
        dateHourFinish: new Date(),
        status: 'active',
        amount: 100,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(expectedResponse);

      const result = await controller.findOne(bookingData);

      expect(result).toEqual(expectedResponse);
      expect(service.findOne).toHaveBeenCalledWith(bookingData);
    });
  });

  describe('findAll', () => {
    it('should find all bookings', async () => {
      const expectedResponse: arrayBookings = { bookings: [] };

      jest.spyOn(service, 'findAll').mockResolvedValue(expectedResponse);

      const result = await controller.findAll({});

      expect(result).toEqual(expectedResponse);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findAllByUser', () => {
    it('should find all bookings by user', async () => {
      const bookingData: inputFindOneBooking = { id: 1 };
      const expectedResponse: arrayBookings = { bookings: [] };

      jest.spyOn(service, 'findAllByUser').mockResolvedValue(expectedResponse);

      const result = await controller.findAllByUser(bookingData);

      expect(result).toEqual(expectedResponse);
      expect(service.findAllByUser).toHaveBeenCalledWith(bookingData);
    });
  });

  describe('checkOut', () => {
    it('should check out a booking', async () => {
      const bookingData: inputCheckOutBooking = {
        id: 1,
        dateHourFinish: '2024-06-23T12:00:00.000Z',
      };
      const expectedResponse: checkOutBookingResponse = { success: true };

      jest.spyOn(service, 'checkOut').mockResolvedValue(expectedResponse);

      const result = await controller.checkOut(bookingData);

      expect(result).toEqual(expectedResponse);
      expect(service.checkOut).toHaveBeenCalledWith(bookingData);
    });
  });

  describe('confirmBooking', () => {
    it('should confirm a booking', async () => {
      const bookingData: inputFindOneBooking = { id: 1 };
      const expectedResponse: checkOutBookingResponse = { success: true };

      jest.spyOn(service, 'confirmBooking').mockResolvedValue(expectedResponse);

      const result = await controller.confirmBooking(bookingData);

      expect(result).toEqual(expectedResponse);
      expect(service.confirmBooking).toHaveBeenCalledWith(bookingData);
    });
  });
});
