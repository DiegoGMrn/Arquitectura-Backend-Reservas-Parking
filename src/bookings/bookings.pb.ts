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
    amount?: number;
    zone?: Zones;
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
    message?: string;
}

export interface inputFindOneBooking {
    id: number;
}

export interface arrayBookings {
    bookings: Bookings[];
}

export interface BookingsServiceClient {
    findAll(request: Empty): Observable<arrayBookings>;
    create(request: inputCreateBooking): Observable<createBookingResponse>;
}

export interface inputFindMultipleZones {
    ids: number[];
}

export interface inputCheckOutBooking {
    id: number;
    dateHourFinish: string;
}

export interface checkOutBookingResponse {
    success: boolean;
    message?: string;
    booking?: Bookings;
}

export interface ZonesServiceClient {
    updateAvailableSpots(request: UpdateAvailableSpotsRequest): Observable<UpdateAvailableSpotsResponse>;
    findOne(request: inputFindOne): Observable<Zones>;
    findMultiple(request: inputFindMultipleZones): Observable<arrayZones>;
    reduceReservedSpots(request: UpdateAvailableSpotsRequest): Observable<UpdateAvailableSpotsResponse>;
}

export interface arrayZones {
    zones: Zones[];
}

export interface UpdateAvailableSpotsRequest {
    zoneId: number;
}

export interface UpdateAvailableSpotsResponse {
    success: boolean;
    message?: string;
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