import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { Bookings } from './entities/bookings.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ClientGrpcProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import * as QRCode from 'qrcode';
import { GetUserResponse, NotificationResponse, User, Zones, arrayZones } from './bookings.pb';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingsRepository: Repository<Bookings>;
  let zonesServiceClient: ClientGrpcProxy;
  let usersServiceClient: ClientGrpcProxy;
  let notificationsServiceClient: ClientGrpcProxy;
  let jwtService: JwtService;

  const mockBookingsRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    manager: {
      connection: {
        createQueryRunner: jest.fn(),
      },
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockGrpcClient = {
    getService: jest.fn().mockReturnValue({
      updateAvailableSpots: jest.fn(),
      findOne: jest.fn(),
      GetUser: jest.fn(),
      sendEmailInformation: jest.fn(),
      reduceReservedSpots: jest.fn(),
      findMultiple: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Bookings),
          useValue: mockBookingsRepository,
        },
        {
          provide: 'ZonesServiceClient',
          useValue: mockGrpcClient,
        },
        {
          provide: 'UsersServiceClient',
          useValue: mockGrpcClient,
        },
        {
          provide: 'NotificationsServiceClient',
          useValue: mockGrpcClient,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    bookingsRepository = module.get<Repository<Bookings>>(getRepositoryToken(Bookings));
    zonesServiceClient = module.get<ClientGrpcProxy>('ZonesServiceClient');
    usersServiceClient = module.get<ClientGrpcProxy>('UsersServiceClient');
    notificationsServiceClient = module.get<ClientGrpcProxy>('NotificationsServiceClient');
    jwtService = module.get<JwtService>(JwtService);

    service.onModuleInit();
  });

  describe('createBooking', () => {
    it('should create a booking', async () => {
      const bookingData = {
        dateHourStart: '2024-06-23T10:00:00.000Z',
        idZone: 1,
        idUser: 1,
        patente: 'ABC123',
      };

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue({ id: 1, ...bookingData }),
        },
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };

      mockBookingsRepository.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);

      jest.spyOn(service['zonesService'], 'updateAvailableSpots').mockReturnValue(of({ success: true }));
      jest.spyOn(mockQueryRunner.manager, 'save').mockResolvedValue({ id: 1, ...bookingData });
      jest.spyOn(service['zonesService'], 'reduceReservedSpots').mockReturnValue(of({ success: true }));
      jest.spyOn(service['zonesService'], 'findOne').mockReturnValue(of({ id: 1, name: 'Zone 1', cantEstacionamientosTotales: 30, cantEstacionamientosOcupados: 10 } as Zones));
      jest.spyOn(service['usersService'], 'GetUser').mockReturnValue(of({ users: [{ id: 1, name: 'John Doe', email: 'john@example.com', } as User] } as unknown as GetUserResponse));
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('mockToken');
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('mockQRCode');
      jest.spyOn(service['notificationsService'], 'sendEmailInformation').mockReturnValue(of({ success: true } as NotificationResponse));

      const result = await service.createBooking(bookingData);

      expect(result).toEqual({ success: true });
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should handle error when creating a booking', async () => {
      const bookingData = {
        dateHourStart: '2024-06-23T10:00:00.000Z',
        idZone: 1,
        idUser: 1,
        patente: 'ABC123',
      };

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue({ id: 1, ...bookingData }),
        },
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };

      mockBookingsRepository.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);

      jest.spyOn(service['zonesService'], 'updateAvailableSpots').mockReturnValue(of({ success: false, message: 'No available parking spots' }));

      const result = await service.createBooking(bookingData);

      expect(result).toEqual({ success: false, message: 'No available parking spots' });
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find one booking', async () => {
      const bookingId = 1;
      const mockBooking = { id: bookingId, idZone: 1, idUser: 1, patente: 'ABC123' };

      mockBookingsRepository.findOne.mockResolvedValue(mockBooking);
      jest.spyOn(service['zonesService'], 'findOne').mockReturnValue(of({ id: 1, name: 'Zone 1', cantEstacionamientosTotales: 30, cantEstacionamientosOcupados: 10 } as Zones));

      const result = await service.findOne({ id: bookingId });

      expect(result).toEqual({ ...mockBooking, zone: { id: 1, name: 'Zone 1', cantEstacionamientosTotales: 30, cantEstacionamientosOcupados: 10 } });
      expect(mockBookingsRepository.findOne).toHaveBeenCalledWith({ where: { id: bookingId } });
    });
  });

  describe('findAll', () => {
    it('should find all bookings', async () => {
      const mockBookings = [
        { id: 1, idZone: 1, idUser: 1, patente: 'ABC123' },
        { id: 2, idZone: 2, idUser: 2, patente: 'XYZ789' },
      ];

      mockBookingsRepository.find.mockResolvedValue(mockBookings);
      jest.spyOn(service['zonesService'], 'findMultiple').mockReturnValue(of({ zones: [{ id: 1, name: 'Zone 1' }, { id: 2, name: 'Zone 2' }] } as arrayZones));

      const result = await service.findAll();

      expect(result).toEqual({
        bookings: [
          { ...mockBookings[0], zone: { id: 1, name: 'Zone 1' } },
          { ...mockBookings[1], zone: { id: 2, name: 'Zone 2' } },
        ],
      });
      expect(mockBookingsRepository.find).toHaveBeenCalled();
    });
  });

  describe('checkOut', () => {
    it('should check out a booking', async () => {
      const bookingId = 1;
      const mockBooking = { id: bookingId, idZone: 1, idUser: 1, patente: 'ABC123', dateHourStart: '2024-06-23T10:00:00.000Z', status: 'active' };
      const dateHourFinish = '2024-06-23T12:00:00.000Z';
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue({ ...mockBooking, dateHourFinish, status: 'checked-out', amount: 40 }),
        },
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };

      mockBookingsRepository.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);
      mockBookingsRepository.findOne.mockResolvedValue(mockBooking);
      jest.spyOn(service['zonesService'], 'findOne').mockReturnValue(of({ id: 1, name: 'Zone 1', cantEstacionamientosTotales: 30, cantEstacionamientosOcupados: 10 } as Zones));

      const result = await service.checkOut({ id: bookingId, dateHourFinish });

      expect(result).toEqual({
        success: true,
        booking: { ...mockBooking, dateHourFinish, status: 'checked-out', amount: 40, zone: { id: 1, name: 'Zone 1', cantEstacionamientosTotales: 30, cantEstacionamientosOcupados: 10 } },
      });
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should handle error when checking out a booking', async () => {
      const bookingId = 1;
      const dateHourFinish = '2024-06-23T12:00:00.000Z';
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        manager: {
          save: jest.fn(),
        },
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };

      mockBookingsRepository.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);
      mockBookingsRepository.findOne.mockResolvedValue(null);

      const result = await service.checkOut({ id: bookingId, dateHourFinish });

      expect(result).toEqual({ success: false, message: 'Booking not found' });
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('confirmBooking', () => {
    
    it('should confirm a booking successfully', async () => {
      const bookingData = { id: 1 };
      const bookingResponse = {
        id: 1,
        status: 'checked-out',
        idZone: 1,
      };
      const parkingResponse = { success: true };
      const updatedBooking = {
        ...bookingResponse,
        status: 'finished',
      };
      const zone: Zones = { id: 1, name: 'Zone 1', cantEstacionamientosTotales: 30, cantEstacionamientosOcupados: 10};

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue({ id: 1, ...bookingData }),
        },
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };

      mockBookingsRepository.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);

      jest.spyOn(mockBookingsRepository, 'findOne').mockResolvedValue(bookingResponse);
      jest.spyOn(service['zonesService'], 'reduceReservedSpots').mockReturnValue(of(parkingResponse));
      jest.spyOn(mockQueryRunner.manager, 'save').mockResolvedValue(updatedBooking);
      jest.spyOn(service['zonesService'], 'findOne').mockReturnValue(of(zone));

      const result = await service.confirmBooking(bookingData);

      expect(result).toEqual({
        success: true,
        booking: { ...updatedBooking, zone },
      });
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should return an error if booking not found', async () => {
      const bookingData = { id: 1 };

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue({ id: 1, ...bookingData }),
        },
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };

      mockBookingsRepository.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);

      jest.spyOn(mockBookingsRepository, 'findOne').mockResolvedValue(null);

      const result = await service.confirmBooking(bookingData);

      expect(result).toEqual({
        success: false,
        message: 'Booking not found',
      });
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should return an error if booking is not checked-out', async () => {
      const bookingData = { id: 1 };
      const bookingResponse = {
        id: 1,
        status: 'in-progress',
      };

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue({ id: 1, ...bookingData }),
        },
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };

      mockBookingsRepository.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);

      jest.spyOn(mockBookingsRepository, 'findOne').mockResolvedValue(bookingResponse);

      const result = await service.confirmBooking(bookingData);

      expect(result).toEqual({
        success: false,
        message: 'Booking not checked-out yet',
      });
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should return an error if reducing parking spots fails', async () => {
      const bookingData = { id: 1 };
      const bookingResponse = {
        id: 1,
        status: 'checked-out',
        idZone: 1,
      };
      const parkingResponse = { success: false };

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue({ id: 1, ...bookingData }),
        },
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };

      mockBookingsRepository.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);

      jest.spyOn(mockBookingsRepository, 'findOne').mockResolvedValue(bookingResponse);
      jest.spyOn(service['zonesService'], 'reduceReservedSpots').mockReturnValue(of(parkingResponse));

      const result = await service.confirmBooking(bookingData);

      expect(result).toEqual({
        success: false,
        message: 'Failed to reduce parking spots',
      });
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction and return error if an exception occurs', async () => {
      const bookingData = { id: 1 };
      const bookingResponse = {
        id: 1,
        status: 'checked-out',
        idZone: 1,
      };

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue({ id: 1, ...bookingData }),
        },
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };

      mockBookingsRepository.manager.connection.createQueryRunner.mockReturnValue(mockQueryRunner);
      
      jest.spyOn(mockBookingsRepository, 'findOne').mockResolvedValue(bookingResponse);
      jest.spyOn(service['zonesService'], 'reduceReservedSpots').mockReturnValue(throwError(new Error('Test Error')));

      const result = await service.confirmBooking(bookingData);

      expect(result).toEqual({
        success: false,
        message: 'Test Error',
      });
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findAllByUser', () => {
    it('should find all bookings by user', async () => {
      const userId = 1;
      const mockBookings = [
        { id: 1, idZone: 1, idUser: userId, patente: 'ABC123' },
        { id: 2, idZone: 2, idUser: userId, patente: 'XYZ789' },
      ];

      mockBookingsRepository.find.mockResolvedValue(mockBookings);
      jest.spyOn(service['zonesService'], 'findMultiple').mockReturnValue(of({ zones: [{ id: 1, name: 'Zone 1' }, { id: 2, name: 'Zone 2' }] } as arrayZones));

      const result = await service.findAllByUser({ id: userId });

      expect(result).toEqual({
        bookings: [
          { ...mockBookings[0], zone: { id: 1, name: 'Zone 1' } },
          { ...mockBookings[1], zone: { id: 2, name: 'Zone 2' } },
        ],
      });
      expect(mockBookingsRepository.find).toHaveBeenCalledWith({ where: { idUser: userId } });
    });
  });
});
