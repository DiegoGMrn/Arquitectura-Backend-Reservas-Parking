import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookingsModule } from './bookings/bookings.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bookings } from './bookings/entities/bookings.entity';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.RESERVAS_DB_HOST,
      port: Number(process.env.RESERVAS_DB_PORT),
      username: process.env.RESERVAS_DB_USERNAME,
      password: process.env.RESERVAS_DB_PASSWORD,
      database: process.env.RESERVAS_DB_DATABASE,
      synchronize: true,
      autoLoadEntities: true,
      useUTC: true,
      entities: [Bookings],
    }),
    BookingsModule],
  controllers: [AppController],
  providers: [ AppService],
})
export class AppModule {}
