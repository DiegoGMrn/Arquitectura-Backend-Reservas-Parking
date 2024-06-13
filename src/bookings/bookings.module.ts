import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Bookings } from './entities/bookings.entity';
import { ClientGrpcProxy } from '@nestjs/microservices';
import { clientProxyNotifications, clientProxyUsers, clientProxyZones } from 'src/common';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forFeature([Bookings]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '10000s' },
      }),
    }),
  ],
  
  controllers: [BookingsController],
  providers: [{
    provide: 'ZonesServiceClient',
    useFactory: (): ClientGrpcProxy => {
      return clientProxyZones();
    }
  },
  {
    provide: 'UsersServiceClient',
    useFactory: (): ClientGrpcProxy => {
      return clientProxyUsers();
    }
  },
  {
    provide: 'NotificationsServiceClient',
    useFactory: (): ClientGrpcProxy => {
      return clientProxyNotifications();
    }
  },
  BookingsService]
})
export class BookingsModule {}
