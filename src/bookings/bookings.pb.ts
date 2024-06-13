import { Observable } from "rxjs";
export interface Empty {
}
export interface Bookings {
    id: number;
    dateHourStart: Date;
    dateHourFinish: Date;
    status: string;
    patente: string;
    idZone: number;
    idUser: number;
}

export interface Zones {
    id: number;
    name: string;
    cantEstacionamientosTotales: number;
    cantEstacionamientosOcupados: number;
}

export interface inputFindOne {
    id: number;
}

export interface inputCreateBooking {
    dateHourStart: string;
    patente: string;
    idZone: number;
    idUser: number;
}

export interface createBookingResponse {
    success: boolean;
}

export interface inputFindOneBooking {
    id: number;
}

export interface BookingsServiceClient {
    findAll(request: Empty): Observable<Bookings>;
    create(request: inputCreateBooking): Observable<createBookingResponse>;
}

export interface ZonesServiceClient {
    updateAvailableSpots(request: UpdateAvailableSpotsRequest): Observable<UpdateAvailableSpotsResponse>;
    findOne(request: inputFindOne): Observable<Zones>;
}

export interface UpdateAvailableSpotsRequest {
    zoneId: number;
}

export interface UpdateAvailableSpotsResponse {
    success: boolean;
}

export interface UsersServiceClient {
    GetUser(request: inputFindOne): Observable<GetUserResponse>;
}

export interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    tipoUser: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string;
}
export interface GetUserResponse {
    users: User;
}

export interface NotificationRequest {
    name: string;
    email: string;
    qrCode: string;
    checkoutUrl: string;
    dateHourStart: string;
    zoneName: string;
    patente: string;
  }
  export interface NotificationResponse {
    success: boolean;
    message: string;
  }
  export interface EmailsServiceClient {
    sendEmailInformation(request: NotificationRequest): Observable<NotificationResponse>;
  }