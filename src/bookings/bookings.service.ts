import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Bookings } from './entities/bookings.entity';
import {  Repository } from 'typeorm';
import { EmailsServiceClient, UsersServiceClient, Zones, ZonesServiceClient, arrayBookings, checkOutBookingResponse, createBookingResponse, inputCheckOutBooking, inputCreateBooking, inputFindMultipleZones, inputFindOneBooking } from './bookings.pb';
import { ClientGrpcProxy } from '@nestjs/microservices';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import * as QRCode from 'qrcode';
import { formatISO, parseISO } from 'date-fns';

@Injectable()
export class BookingsService {
    constructor(
        @InjectRepository(Bookings) private readonly bookingsRepository: Repository<Bookings>,
        @Inject('ZonesServiceClient')
        private readonly zonesServiceClient: ClientGrpcProxy,
        @Inject('UsersServiceClient')
        private readonly usersServiceClient: ClientGrpcProxy,
        @Inject('NotificationsServiceClient')
        private readonly notificationsServiceClient: ClientGrpcProxy,
        private readonly jwtService: JwtService,
    ) {}
    private zonesService: ZonesServiceClient;
    private usersService: UsersServiceClient;
    private notificationsService: EmailsServiceClient;

    onModuleInit(): void {
        this.zonesService =
            this.zonesServiceClient.getService<ZonesServiceClient>('ZonesService');
        this.usersService =
            this.usersServiceClient.getService<UsersServiceClient>('UserService');
        this.notificationsService =
            this.notificationsServiceClient.getService<EmailsServiceClient>('EmailsService');
    }

    public async createBooking(booking: inputCreateBooking): Promise<createBookingResponse> {
        const queryRunner = this.bookingsRepository.manager.connection.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {

            const dateHourStart = formatISO(parseISO(booking.dateHourStart));

            const parkingResponse = await lastValueFrom(
                this.zonesService.updateAvailableSpots({ zoneId: booking.idZone }),
            );
              
            if (!parkingResponse.success) {
                throw new Error(parkingResponse.message);
            }

            const newBooking = await queryRunner.manager.save(Bookings, {
                ...booking,
                dateHourStart
              });

            const zone = await lastValueFrom(this.zonesService.findOne({ id: newBooking.idZone }));
            const user = await lastValueFrom(this.usersService.GetUser({ id: newBooking.idUser }));

            if (!user.users) {
                throw new Error('User not found');
            }

            if (!zone) {
                throw new Error('Zone not found');
            }

            const token = await this.jwtService.signAsync({ 
                bookingId: newBooking.id,
                dateHourStart: newBooking.dateHourStart,
                NameZone: zone.name,
                idUser: newBooking.idUser,
                patente: newBooking.patente,
                userName: user.users[0].name,
            });

            const checkoutUrl = `${process.env.FRONT_CHECKOUT_URL}?token=${token}`;

            const qrCode = await QRCode.toDataURL(checkoutUrl);

            const notificationRequest = {
                name: user.users[0].name,
                email: user.users[0].email,
                qrCode: qrCode,
                checkoutUrl: checkoutUrl,
                dateHourStart: newBooking.dateHourStart.toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
                zoneName: zone.name,
                patente: newBooking.patente,
            };
            const notificationResponse = await lastValueFrom(
                this.notificationsService.sendEmailInformation(notificationRequest),
            );

            if (!notificationResponse.success) {
                throw new Error('Failed to send notification');
              }

            await queryRunner.commitTransaction();
            const response: createBookingResponse = {
                success: true,
            }
            return response;
        } catch (error) {
            console.log(error);
            await queryRunner.rollbackTransaction();

            if(error.message !== 'No available parking spots' && error.message !== 'Zone not found' && error.message !== 'User not found') {
                await lastValueFrom(
                    this.zonesService.reduceReservedSpots({ zoneId: booking.idZone }),
                );
            }

            const response: createBookingResponse = {
                success: false,
                message: error.message,
            }
            return response;
        } finally {
            await queryRunner.release();
        }
    }

    public async findOne(booking: inputFindOneBooking): Promise<Bookings> {
        const bookingsResponse: Bookings = await this.bookingsRepository.findOne({ where: { id: booking.id } });
        const zone = await lastValueFrom(this.zonesService.findOne({ id: bookingsResponse.idZone }));
        const enrichedBookings = {
            ...bookingsResponse,
            zone,
        };
      
        return enrichedBookings;

    }

    public async findAll(): Promise<arrayBookings> {
        const bookingsResponse: arrayBookings = { bookings: await this.bookingsRepository.find() };

        const zoneIds = bookingsResponse.bookings.map((booking: Bookings) => booking.idZone);
        const uniqueZoneIds: inputFindMultipleZones = {ids: Array.from(new Set(zoneIds))};
        const zonesResponse = await firstValueFrom(this.zonesService.findMultiple(uniqueZoneIds));
        const zonesMap = new Map(zonesResponse.zones.map((zone: Zones) => [zone.id, zone]));

        const enrichedBookings = bookingsResponse.bookings.map((booking: Bookings) => ({
            ...booking,
            zone: zonesMap.get(booking.idZone),
        }));
        console.log(enrichedBookings[0].zone);
        return { bookings: enrichedBookings };

    }

    public async findAllByUser(booking: inputFindOneBooking): Promise<arrayBookings> {
        const bookingsResponse : arrayBookings = { bookings: await this.bookingsRepository.find({ where: { idUser: booking.id } }) };
        
        const zoneIds = bookingsResponse.bookings.map((booking: Bookings) => booking.idZone);
        const uniqueZoneIds: inputFindMultipleZones = {ids: Array.from(new Set(zoneIds))};
        const zonesResponse = await firstValueFrom(this.zonesService.findMultiple(uniqueZoneIds));
        const zonesMap = new Map(zonesResponse.zones.map((zone: Zones) => [zone.id, zone]));

        const enrichedBookings = bookingsResponse.bookings.map((booking: Bookings) => ({
            ...booking,
            zone: zonesMap.get(booking.idZone),
        }));
        console.log(enrichedBookings[0].zone);
        return { bookings: enrichedBookings };
    }

    public async checkOut(booking: inputCheckOutBooking): Promise<checkOutBookingResponse> {
        const queryRunner = this.bookingsRepository.manager.connection.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const dateHourFinish = formatISO(parseISO(booking.dateHourFinish));
            const bookingResponse = await this.bookingsRepository.findOne({ where: { id: booking.id } });
            
            if(!bookingResponse) {
                throw new Error('Booking not found');
            }

            if(bookingResponse.status === 'finished') {
                throw new Error('Booking already finished');
            }
            
            const time = Math.floor((new Date(dateHourFinish).getTime() - new Date(bookingResponse.dateHourStart).getTime()) / 60000);
            const amount = Math.ceil(time / 30) * Number(process.env.AMOUNT_PER_HALF_HOUR);

            const updatedBooking = await queryRunner.manager.save(Bookings, {
                ...bookingResponse,
                dateHourFinish,
                amount,
                status: 'checked-out',
            });

            await queryRunner.commitTransaction();
            
            const zone = await lastValueFrom(this.zonesService.findOne({ id: updatedBooking.idZone }));
            const enrichedBookings = {
                ...updatedBooking,
                zone,
            };
      
            const response: checkOutBookingResponse = {
                success: true,
                booking: enrichedBookings,
            }
            return response;

        } catch (error) {
            console.log(error);
            await queryRunner.rollbackTransaction();
            const response: checkOutBookingResponse = {
                success: false,
                message: error.message,
            }
            return response;
            
        } finally {
            await queryRunner.release();
        }
        
    }

    public async confirmBooking(booking: inputFindOneBooking): Promise<checkOutBookingResponse> {
        const queryRunner = this.bookingsRepository.manager.connection.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const bookingResponse = await this.bookingsRepository.findOne({ where: { id: booking.id } });
            
            if(!bookingResponse) {
                throw new Error('Booking not found');
            }

            if(bookingResponse.status !== 'checked-out') {
                throw new Error('Booking not checked-out yet');
            }

            const parkingResponse = await lastValueFrom(
                this.zonesService.reduceReservedSpots({ zoneId: bookingResponse.idZone }),
            );

            if (!parkingResponse.success) {
                throw new Error('Failed to reduce parking spots');
            }

            const updatedBooking = await queryRunner.manager.save(Bookings, {
                ...bookingResponse,
                status: 'finished',
            });

            await queryRunner.commitTransaction();
            
            const zone = await lastValueFrom(this.zonesService.findOne({ id: updatedBooking.idZone }));
            const enrichedBookings = {
                ...updatedBooking,
                zone,
            };
      
            const response: checkOutBookingResponse = {
                success: true,
                booking: enrichedBookings,
            }
            return response;

        } catch (error) {
            console.log(error);
            await queryRunner.rollbackTransaction();
            const response: checkOutBookingResponse = {
                success: false,
                message: error.message,
            }
            return response;
            
        } finally {
            await queryRunner.release();
        }
        
    }
}
