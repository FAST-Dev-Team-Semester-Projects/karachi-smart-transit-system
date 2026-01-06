-- Karachi Smart Transit System Database Schema
-- This file defines the complete database structure for the KSTS system.
-- It includes tables for users, services, routes, stops, buses, drivers, trips, bookings, payments, and tickets.
-- Relationships are established via foreign keys to maintain data integrity.
-- Database triggers enforce business rules (e.g., driver assignment conflicts, core data protection).
-- Related files: triggers/admin_triggers.sql, functions/, views/, indexes/create_performance_indexes.sql, migrations/.

create database ksts_db;

use ksts_db;

----------------------------------------------------------------------------------------------------

-- Drop existing tables in reverse dependency order to avoid foreign key constraint violations
-- Child tables (with foreign keys) must be dropped before parent tables they reference
-- Order: tickets → payments → bookings → trips → drivers_assignments → drivers → buses → routes_stops → stops → routes → services → users
drop table if exists tickets;
drop table if exists payments;
drop table if exists bookings;
drop table if exists trips;
drop table if exists drivers_assignments;
drop table if exists drivers;
drop table if exists buses;
drop table if exists routes_stops;
drop table if exists stops;
drop table if exists routes;
drop table if exists services;
drop table if exists users;

----------------------------------------------------------------------------------------------------

-- Create tables: Define core entities and their relationships using foreign keys for referential integrity
-- Users of the system: Admin and Passenger
create table users (
	user_id int auto_increment primary key,
    username varchar(100) unique not null,
    full_name varchar(100) not null,
    email varchar(150) unique not null,
    password varchar(255) not null,
    phone_number varchar(20),
    role ENUM('admin', 'passenger') not null -- admin: system management access, passenger: booking and travel access
);

-- BRTs and Peoples Bus Service (Red, EV, Pink)
create table services (
	service_id int auto_increment primary key,
    service_name varchar(100) unique not null
);

-- Routes operating under specific service (e.g. Green Line Corridor, R9 (Gulshan e Hadeed - Tower), etc.)
create table routes (
	route_id int auto_increment primary key,
    service_id int not null,
    route_name varchar(100) not null,

	constraint ux_service_route_name unique (service_id, route_name), -- Prevents same route name per service

    constraint fk_route_service 
		foreign key (service_id) references services(service_id)
        on delete cascade
        on update cascade
);

-- Stops throughout city used by each route
create table stops (
	stop_id int auto_increment primary key,
    stop_name varchar(100) not null,
    latitude decimal(10,7) not null,
    longitude decimal(10,7) not null,
    
    constraint ux_stops_lat_long unique (latitude, longitude) -- Prevent duplicate coordinates
);

-- Route <-> Stop mapping in order
create table routes_stops (
	route_id int not null,
    stop_id int not null,
    stop_order int not null,
    
    primary key (route_id, stop_id),
    constraint ux_route_stop_order unique (route_id, stop_order), -- Same route won't have duplicate stop_order
    
    constraint fk_rs_route 
		foreign key (route_id) references routes(route_id)
		on delete cascade
        on update cascade,        
	constraint fk_rs_stop
		foreign key (stop_id) references stops(stop_id)
		on delete cascade
        on update cascade
);

-- Bus entity
create table buses (
	bus_id int auto_increment primary key, -- Surrogate key (auto-increment) preferred over natural key (number_plate) for performance, storage efficiency, and consistency with other tables
    number_plate varchar(50) unique not null, -- Natural key: unique bus identifier, but string PK would be slower for joins and indexes
    capacity int not null, -- Total capacity, remaining seats calculated dynamically (not stored); see backend/routes/passenger.py line 197 for availability calculation
);

-- Driver entity
create table drivers (
	driver_id int auto_increment primary key, -- Surrogate key (auto-increment) preferred over natural key (license_number) for performance, storage efficiency, and consistency with other tables
    full_name varchar(100) not null,
    license_number varchar(20) unique not null,
    phone_number varchar(20)
);

-- Bus <-> Driver mapping for each day (admin management with database-enforced scheduling validation)
create table drivers_assignments (
    driver_id int not null,
    bus_id int not null,
    start_time datetime not null,
    end_time datetime,

    -- Primary key prevents duplicate assignments for same driver-bus-time
    constraint pk_drivers_assignments primary key (driver_id, bus_id, start_time),

    -- Database triggers prevent overlapping assignments (same driver on multiple buses simultaneously)
    -- See database/triggers/admin_triggers.sql for tr_bi_drivers_assignments_conflict

    constraint fk_da_driver
		foreign key (driver_id) references drivers(driver_id)
        on delete cascade
        on update cascade,        
	constraint fk_da_bus
		foreign key (bus_id) references buses(bus_id)
        on delete cascade
        on update cascade
);

-- Multiple buses running on each route, represented by trips
create table trips (
    trip_id int auto_increment primary key, -- Surrogate key for unique trip identification; bookings table references this key
    bus_id int not null,
    route_id int not null, -- Foreign key to routes.route_id; ensures every trip is assigned to a specific route
    direction enum('forward', 'backward') not null, -- bidirectional trips; direction auto-detection in database/migrations/passenger_booking_procedures.sql
    departure_time datetime not null,
    arrival_time datetime,
    origin_trip_id int null, -- Links return trips to their originating trip; prevents return trips from generating their own returns; used in backend/bus_tracker.py for bidirectional trip management
    status enum('scheduled', 'running', 'completed', 'cancelled') not null default 'scheduled',
    
    constraint ux_trips_bus_route_departure unique (bus_id, route_id, departure_time), -- Prevent duplicate same bus on same route at same time

    constraint fk_trip_bus
		foreign key (bus_id) references buses(bus_id)
        on delete cascade
        on update cascade,
    constraint fk_trip_route
        foreign key (route_id) references routes(route_id)
        on delete cascade
        on update cascade
);

-- User booking for each trip
create table bookings (
	booking_id int auto_increment primary key,
    user_id int not null,
    trip_id int not null,
    seat_number int not null, -- Seat number inside the bus
    origin_stop_id int not null,
    destination_stop_id int not null,
    booking_date datetime default current_timestamp, -- Timestamp when booking was created
    status enum('confirmed', 'cancelled') default 'confirmed', -- Booking status; confirmed allows travel (counts toward seat usage), cancelled prevents it (frees seats); see backend/routes/passenger.py lines 150, 435

    constraint fk_booking_user
		foreign key (user_id) references users(user_id)
        on delete cascade
        on update cascade,
	constraint fk_booking_trip
		foreign key (trip_id) references trips(trip_id)
        on delete cascade
        on update cascade,
	constraint fk_booking_origin_stop
		foreign key (origin_stop_id) references stops(stop_id),
	constraint fk_booking_destination_stop
		foreign key (destination_stop_id) references stops(stop_id)
);

-- Payment records for bookings
create table payments (
	payment_id int auto_increment primary key,
    booking_id int not null,
    amount int not null,
    payment_date datetime default current_timestamp,
    method enum('online', 'recharge_card') not null, -- Payment method; 'online' implemented for credit card payments, 'recharge_card' is placeholder for future physical prepaid card system
    status enum('pending', 'paid', 'failed') default 'pending',
    transaction_reference varchar(100) null,  -- Payment gateway transaction ID; used in backend/routes/passenger.py for payment processing
    card_last_four char(4) null,              -- Last 4 digits of card (PCI compliant); used in backend/routes/passenger.py for secure card reference

    constraint ux_booking_payment unique (booking_id), -- One payment per booking

    constraint fk_payment_booking
		foreign key (booking_id) references bookings(booking_id)
        on delete cascade
        on update cascade
);

-- Ticket generated for each booking
create table tickets (
	ticket_id int auto_increment primary key,
    booking_id int not null,
    issue_date datetime default current_timestamp,
    qr_code varchar(255) unique not null, -- Unique QR code for ticket validation; generated in backend/routes/passenger.py
    
    constraint fk_ticket_booking
		foreign key (booking_id) references bookings(booking_id)
        on delete cascade
        on update cascade
);

----------------------------------------------------------------------------------------------------

show tables;

select * from tickets;
select * from payments;
select * from bookings;
select * from trips;
select * from drivers_assignments;
select * from drivers;
select * from buses;
select * from routes_stops;
select * from stops;
select * from routes;
select * from services;
select * from users;

describe tickets;
describe payments;
describe bookings;
describe trips;
describe drivers_assignments;
describe drivers;
describe buses;
describe routes_stops;
describe stops;
describe routes;
describe services;
describe users;
    
------------------------------------------------------------------------

-- Records deletion block: Truncate tables in reverse dependency order (child before parent) to safely clear all data
set foreign_key_checks = 0;

truncate table tickets;
truncate table payments;
truncate table bookings;
truncate table trips;
truncate table drivers_assignments;
truncate table drivers;
truncate table buses;
truncate table routes_stops;
truncate table stops;
truncate table routes;
truncate table services;
truncate table users;

set foreign_key_checks = 1;