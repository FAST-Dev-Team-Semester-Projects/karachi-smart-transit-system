-- insert_all_brt_master.sql
-- Master script to insert all 6 BRT lines into ksts_db
-- Order: Green → Orange → Red → Yellow → Blue → Brown
-- Run this in MySQL Workbench with ksts_db selected.

USE ksts_db;

-- Truncate route/stop related tables only (preserves users, bookings, payments, etc.)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE routes_stops;
TRUNCATE TABLE stops;
TRUNCATE TABLE routes;
TRUNCATE TABLE services;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 1) GREEN LINE BRT
-- =============================================================================

INSERT INTO services (service_name) VALUES
('Green Line BRT');

INSERT INTO routes (service_id, route_name) VALUES
(1, 'Green Line Corridor');

INSERT INTO stops (stop_name, latitude, longitude) VALUES
('Numaish Chowrangi', 24.8724682, 67.0353382),
('Patel Para (Guru Mandir) Station', 24.8811317, 67.0384163),
('Lasbela Chowk Station', 24.8860049, 67.0345593),
('Sanitary Market (Gulbahar) Station', 24.8950959, 67.0307358),
('Nazimabad No.1 Station', 24.8999637, 67.0304847),
('Enquiry Office Station', 24.9066014, 67.0310170),
('Annu Bhai Park Station', 24.9171505, 67.0313289),
('Board Office', 24.9268943, 67.0298399),
('Hyderi Station', 24.9381443, 67.0428257),
('Five Star Chowrangi Station', 24.9460741, 67.0503766),
('Jummah Bazaar (Bayani Center) Station', 24.9505593, 67.0544800),
('Erum Shopping Mall (Shadman No.2) Station', 24.9587886, 67.0615444),
('Nagan Chowrangi', 24.9659013, 67.0670411),
('U.P. More Station', 24.9737143, 67.0668378),
('Road 4200 (Saleem Centre) Station', 24.9782804, 67.0669920),
('Power House Chowrangi Station', 24.9842907, 67.0661188),
('Road 2400 (Aisha Complex) Station', 24.9927508, 67.0653392),
('2 Minute Chowrangi Station', 25.0006681, 67.0649429),
('Surjani Chowrangi (4K) Station', 25.0051709, 67.0648499),
('Karimi Chowrangi Station', 25.0113722, 67.0645019),
('KDA Flats Station', 25.0176914, 67.0641370),
('Abdullah Chowk Station', 25.0274073, 67.0642646);

INSERT INTO routes_stops (route_id, stop_id, stop_order) VALUES
(1, 1, 1),
(1, 2, 2),
(1, 3, 3),
(1, 4, 4),
(1, 5, 5),
(1, 6, 6),
(1, 7, 7),
(1, 8, 8),
(1, 9, 9),
(1, 10, 10),
(1, 11, 11),
(1, 12, 12),
(1, 13, 13),
(1, 14, 14),
(1, 15, 15),
(1, 16, 16),
(1, 17, 17),
(1, 18, 18),
(1, 19, 19),
(1, 20, 20),
(1, 21, 21),
(1, 22, 22);

-- =============================================================================
-- 2) ORANGE LINE BRT
-- =============================================================================

INSERT INTO services (service_name) VALUES
('Orange Line BRT');

INSERT INTO routes (service_id, route_name) VALUES
(2, 'Orange Line Corridor');

INSERT INTO stops (stop_name, latitude, longitude) VALUES
('Orangi 5 No.', 24.9421791, 66.9984457),
('Pone Panch Chowrangi', 24.9388544, 67.0048105),
('Abdullah College', 24.9292090, 67.0253194);

INSERT INTO routes_stops (route_id, stop_id, stop_order) VALUES
(2, 23, 1),
(2, 24, 2),
(2, 25, 3),
(2, 8, 4);

-- =============================================================================
-- 3) RED LINE BRT
-- =============================================================================

INSERT INTO services (service_name) VALUES
('Red Line BRT');

INSERT INTO routes (service_id, route_name) VALUES
(3, 'Red Line Corridor');

INSERT INTO stops (stop_name, latitude, longitude) VALUES
('Khudadad Colony', 24.8736097, 67.0429575),
('Islamia College', 24.8797608, 67.0466588),
('Usmania Park', 24.8934024, 67.0487139),
('Jail Chowrangi', 24.8852980, 67.0566818),
('Faizan-e-Madina', 24.9027163, 67.0619463),
('Civic Center', 24.9092103, 67.0749923),
('Expo Centre', 24.9097879, 67.0756786),
('Bait-ul-Mukarram', 24.9185795, 67.1190174),
('Urdu University', 24.9143953, 67.0894047),
('NIPA', 24.9179182, 67.0971890),
('Safari Park', 24.9233330, 67.1080004),
('NED University', 24.9330459, 67.1152817),
('Karachi University', 24.9390476, 67.1237962),
('Sheikh Zayed Islamic Center', 24.9353258, 67.1303906),
('Mosamiyat', 24.9384192, 67.1443809),
('Jauhar Complex', 24.9383790, 67.1478428),
('Safoora Chowrangi', 24.9395442, 67.1561693),
('Race Course', 24.9373257, 67.1698593),
('Check Post 6', 24.9344040, 67.1771157),
('Acacia Golf Club', 24.9197135, 67.1855368),
('Tank Chowk', 24.9126037, 67.1859650),
('Model Colony', 24.9036403, 67.1821539),
('Malir Halt', 24.8847426, 67.1752850);

INSERT INTO routes_stops (route_id, stop_id, stop_order) VALUES
(3, 1, 1),
(3, 26, 2),
(3, 27, 3),
(3, 28, 4),
(3, 29, 5),
(3, 30, 6),
(3, 31, 7),
(3, 32, 8),
(3, 33, 9),
(3, 34, 10),
(3, 35, 11),
(3, 36, 12),
(3, 37, 13),
(3, 38, 14),
(3, 39, 15),
(3, 40, 16),
(3, 41, 17),
(3, 42, 18),
(3, 43, 19),
(3, 44, 20),
(3, 45, 21),
(3, 46, 22),
(3, 47, 23),
(3, 48, 24);

-- =============================================================================
-- 4) YELLOW LINE BRT
-- =============================================================================

INSERT INTO services (service_name) VALUES
('Yellow Line BRT');

INSERT INTO routes (service_id, route_name) VALUES
(4, 'Yellow Line Corridor');

INSERT INTO stops (stop_name, latitude, longitude) VALUES
('Khalid Bin Waleed Road', 24.8744648, 67.0569146),
('Shahrah e Faisal', 24.8676852, 67.0832479),
('Naval Estate', 24.8518395, 67.0518967),
('NMC', 24.8468254, 67.0560682),
('Circular Avenue', 24.8425817, 67.0609939),
('Sunset Boulevard', 24.8318462, 67.0602584),
('Khayaban-e-Ittehad', 24.8110176, 67.0783657),
('KPT Interchange 2', 24.8334419, 67.0800822),
('KPT Interchange 1', 24.8308632, 67.0807898),
('Brookes Chowrangi', 24.8351863, 67.0996296),
('Toyota Southern', 24.8360784, 67.1088750),
('Sector 23', 24.8374228, 67.1154838),
('Shan Chowrangi', 24.8388666, 67.1206254),
('National Refinery', 24.8469898, 67.1249543),
('VITA Chowrangi', 24.8415708, 67.1341145),
('Bilal Chowrangi', 24.8433408, 67.1420771),
('SNA Motors', 24.8434970, 67.1467694),
('Getz Pharma', 24.8455120, 67.1570369),
('Singer Chowrangi', 24.8444987, 67.1471663),
('Jamia Dar-ul-Uloom', 24.8457077, 67.1664958),
('Herbion Pharma', 24.8501750, 67.1760334),
('Murtaza Chowrangi', 24.8504853, 67.1815045),
('Sector 21', 24.8518225, 67.1863425),
('Landhi Graveyard', 24.8514400, 67.1916832),
('Mansehra Colony', 24.8549314, 67.2000484),
('Dawood Chowrangi', 24.8505107, 67.2070830);

INSERT INTO routes_stops (route_id, stop_id, stop_order) VALUES
(4, 1, 1),
(4, 49, 2),
(4, 50, 3),
(4, 51, 4),
(4, 52, 5),
(4, 53, 6),
(4, 54, 7),
(4, 55, 8),
(4, 56, 9),
(4, 57, 10),
(4, 58, 11),
(4, 59, 12),
(4, 60, 13),
(4, 61, 14),
(4, 62, 15),
(4, 63, 16),
(4, 64, 17),
(4, 65, 18),
(4, 66, 19),
(4, 67, 20),
(4, 68, 21),
(4, 69, 22),
(4, 70, 23),
(4, 71, 24),
(4, 72, 25),
(4, 73, 26),
(4, 74, 27);

-- =============================================================================
-- 5) BLUE LINE BRT
-- =============================================================================

INSERT INTO services (service_name) VALUES
('Blue Line BRT');

INSERT INTO routes (service_id, route_name) VALUES
(5, 'Blue Line Corridor');

INSERT INTO stops (stop_name, latitude, longitude) VALUES
('Guru Mandir', 24.8812583, 67.0384270),
('Teen Hatti', 24.8933472, 67.0436162),
('Dak Khana', 24.9089165, 67.0487164),
('Al-Karam Apartments', 24.9125962, 67.0496603),
('Karimabad', 24.9207097, 67.0533078),
('Jamat Khana', 24.9230484, 67.0597761),
('Ayesha Manzil', 24.9276991, 67.0646899),
('Water Pump', 24.9358602, 67.0755901),
('Yousuf Plaza', 24.9397104, 67.0808159),
('Sohrab Goth', 24.9515300, 67.0857858),
('Al-Asif Square', 24.9509926, 67.0921191);

INSERT INTO routes_stops (route_id, stop_id, stop_order) VALUES
(5, 1, 1),
(5, 75, 2),
(5, 76, 3),
(5, 77, 4),
(5, 78, 5),
(5, 79, 6),
(5, 80, 7),
(5, 81, 8),
(5, 82, 9),
(5, 83, 10),
(5, 84, 11),
(5, 85, 12);

-- =============================================================================
-- 6) BROWN LINE BRT
-- =============================================================================

INSERT INTO services (service_name) VALUES
('Brown Line BRT');

INSERT INTO routes (service_id, route_name) VALUES
(6, 'Brown Line Corridor');

INSERT INTO stops (stop_name, latitude, longitude) VALUES
('Korangi Sector 20', 24.8493010, 67.1718441),
('Colony #2', 24.8813541, 67.1488314),
('Shama Center', 24.8850149, 67.1455622),
('Nata Khan', 24.8827757, 67.1336989),
('Drigh Road', 24.8848293, 67.1291285),
('COD', 24.8921089, 67.1217386),
('Askari IV', 24.9009453, 67.1163312),
('Johar Morr', 24.9047072, 67.1134845),
('Sunday Bazar', 24.9087258, 67.1097294),
('Sindbad', 24.9164234, 67.0989855),
('Moti Mehal', 24.8830994, 67.0724116),
('UBL Sports Complex', 24.9330773, 67.0837412),
('Al-Mohsin Imam Bargah', 24.9392209, 67.0848772),
('Ancholi', 24.9485317, 67.0816633),
('Afroz Textiles', 24.9510609, 67.0800111),
('Namak Bank', 24.9591462, 67.0743366);

INSERT INTO routes_stops (route_id, stop_id, stop_order) VALUES
(6, 66, 1),
(6, 86, 2),
(6, 87, 3),
(6, 88, 4),
(6, 89, 5),
(6, 90, 6),
(6, 91, 7),
(6, 92, 8),
(6, 93, 9),
(6, 94, 10),
(6, 95, 11),
(6, 35, 12),
(6, 96, 13),
(6, 97, 14),
(6, 98, 15),
(6, 84, 16),
(6, 99, 17),
(6, 100, 18),
(6, 101, 19),
(6, 13, 20);
