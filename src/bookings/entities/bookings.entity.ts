import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Bookings {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({ type: 'timestamp with time zone'})
    dateHourStart: Date;
    @Column({ type: 'timestamp with time zone', nullable: true})
    dateHourFinish: Date;
    @Column({ default: 'Activa' })
    status: string;
    @Column()
    patente: string;
    @Column()
    idZone: number;
    @Column()
    idUser: number;
    @Column({ default: 0 })
    amount: number;
}