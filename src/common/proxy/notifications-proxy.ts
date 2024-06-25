import {
    ClientGrpcProxy,
    ClientProxyFactory,
    Transport,
  } from '@nestjs/microservices';
import { join } from 'path';


export const clientProxyNotifications = (): ClientGrpcProxy => {
    return ClientProxyFactory.create({
        transport: Transport.GRPC,
        options: {
            url: process.env.NOTIFICATIONS_GRPC_SERVER_URL || '0.0.0.0:50054',
            package: 'notifications',
            protoPath: join(__dirname, '../../../src/bookings/emails.proto'),
        },
    });
};