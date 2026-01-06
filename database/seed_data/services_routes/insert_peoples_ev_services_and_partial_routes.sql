-- IMPORTANT: This script only inserts master data for the Peoples EV service and SOME (not all) of its routes.
-- To fully seed ALL EV routes and their stop mappings, you must also run:
--   insert_peoples_ev_routes_stops.sql
-- This companion script completes the insertion of all routes and their stop associations.

-- Currently missing in this script:
--   EV2, EV3, EV4, EV5, pink buses (1,2,3,9,10), Red Buses (3,8,11,12)

USE ksts_db;

-- Insert services (idempotent)
INSERT INTO services (service_name) VALUES
  ('Red-Bus'),
  ('EV-Bus'),
  ('Pink-Bus')
ON DUPLICATE KEY UPDATE
  service_name = VALUES(service_name);

-- Capture service_ids into variables for use below
SELECT service_id INTO @service_red  FROM services WHERE service_name='Red-Bus' LIMIT 1;
SELECT service_id INTO @service_ev   FROM services WHERE service_name='EV-Bus' LIMIT 1;
SELECT service_id INTO @service_pink FROM services WHERE service_name='Pink-Bus' LIMIT 1;

-- Insert Red-Bus routes (R1-R13 are Red-Bus routes; Pink-Bus shares some of these)
INSERT INTO routes (service_id, route_name) VALUES
  (@service_red, 'R1 (Khokrapar - Dockyard)'),
  (@service_red, 'R2 (Powerhouse - Indus Hospital)'),
  (@service_red, 'R3 (Powerhouse - Nasir Jump)'),
  (@service_red, 'R4 (Power House - Keamari)'),
  (@service_red, 'R8 (Yousuf Goth - Tower)'),
  (@service_red, 'R9 (Gulshan e Hadeed - Tower)'),
  (@service_red, 'R10 (Numaish - Ibrahim Hyderi)'),
  (@service_red, 'R11 (Miran Nakka - Shireen Jinnah Colony)'),
  (@service_red, 'R12 (Naddi Kinara - Lucky Star)'),
  (@service_red, 'R13 (Hawksbay - Tower)')
ON DUPLICATE KEY UPDATE
  route_name = VALUES(route_name);

-- Insert EV routes
INSERT INTO routes (service_id, route_name) VALUES
  (@service_ev, 'EV1 (Malir Cantt - Dolmen Mall Clifton)'),
  (@service_ev, 'EV2 (Bahria Town - Malir Halt)'),
  (@service_ev, 'EV3 (Malir Cantt - Numaish)'),
  (@service_ev, 'EV4 (Bahria Town - Ayesha Manzil)'),
  (@service_ev, 'EV5 (DHA City - Sohrab Goth)')
ON DUPLICATE KEY UPDATE
  route_name = VALUES(route_name);

-- Insert Pink-Bus routes (female-only service that shares routes with Red-Bus)
INSERT INTO routes (service_id, route_name) VALUES
  (@service_pink, 'R1 (Khokrapar - Dockyard)'),
  (@service_pink, 'R2 (Powerhouse - Indus Hospital)'),
  (@service_pink, 'R3 (Powerhouse - Nasir Jump)'),
  (@service_pink, 'R9 (Gulshan e Hadeed - Tower)'),
  (@service_pink, 'R10 (Numaish - Ibrahim Hyderi)')
ON DUPLICATE KEY UPDATE
  route_name = VALUES(route_name);

-- =============================================================================
-- STOPS (Idempotent inserts with real coordinates)
-- =============================================================================

INSERT INTO stops (stop_name, latitude, longitude) VALUES
  ('Nagan Chowrangi', 24.9659013, 67.0670411),
  ('Power House Chowrangi Station', 24.9842907, 67.0661188),
  ('NIPA', 24.9179182, 67.0971890),
  ('Malir Halt', 24.8847426, 67.1752850),
  ('Sohrab Goth', 24.9515300, 67.0857858),
  ('Nata Khan', 24.8827757, 67.1336989),
  ('Drigh Road', 24.8848293, 67.1291285),
  ('Johar Morr', 24.9047072, 67.1134845),
  ('Tank Chowk', 24.9126037, 67.1859650),
  ('Model Colony', 24.9036403, 67.1821539),
  ('Karimabad', 24.9207097, 67.0533078),
  ('Ayesha Manzil', 24.9276991, 67.0646899),
  ('Teen Hatti', 24.8933472, 67.0436162),
  ('Numaish Chowrangi', 24.8724682, 67.0353382),
  ('COD', 24.8921089, 67.1217386),
  ('Water Pump', 24.9358602, 67.0755901),
  ('Khokrapar', 24.9057494, 67.2091871),
  ('Saudabad', 24.905465229706667, 67.01653753002418),
  ('RCD Ground', 24.901077643981118, 67.01681647974895),
  ('Kalaboard', 24.88210951749604, 67.18269011473738),
  ('Colony Gate', 24.887286177354202, 67.14971410753357),
  ('PAF Base Faisal', 24.88401977824557, 67.11615274852736),
  ('Laal Kothi', 24.862580759025715, 67.06973328795308),
  ('Karsaz', 24.876143938843835, 67.10106924951559),
  ('Nursery', 24.860866008784914, 67.06284213741925),
  ('FTC', 24.85940261279554, 67.05256106413701),
  ('Regent Plaza', 24.855713012185596, 67.03891846988894),
  ('Metropole', 24.850601309291275, 67.029989168106),
  ('Fawwara Chowk', 24.879302840279944, 67.02019360858402),
  ('Arts Council', 24.85325335879867, 67.02092192577919),
  ('Shaheen Complex', 24.850895650212045, 67.01876296467049),
  ('I.I.Chundrigar', 24.84906625908913, 66.99736340326095),
  ('Tower', 24.849221999440104, 66.997407626855),
  ('Fisheries', 24.85350405709978, 66.98193635190799),
  ('Dockyard', 24.830446157992494, 66.97077834373542),
  ('UP Mor', 24.97303369633688, 67.06674276625907),
  ('Shafiq Morr', 24.957390985187356, 67.0762029453646),
  ('Gulshan Chowrangi', 24.92213893324775, 67.09416373927269),
  ('Shah Faisal Colony', 24.88983869438613, 67.15338549598475),
  ('Singer Chowrangi', 24.8444987, 67.1471663),
  ('Khaddi Stop', 24.840631255678694, 67.16137917974679),
  ('Indus Hospital', 24.820582832446522, 67.1119815444598),
  ('Liaquatabad 10 Number', 24.90946039366708, 67.04948074112345),
  ('Laloo Khait', 24.909053625292163, 67.04971602336242),
  ('Jehangir Road', 24.886816757468317, 67.04144946810732),
  ('Mobile Market', 24.86372311745747, 67.02513760168704),
  ('Urdu Bazar', 24.882340786454552, 66.98555611651258),
  ('Civil Hospital', 24.859735541489385, 67.01144986440391),
  ('City Court', 24.855442089925145, 67.00840280162296),
  ('Light House', 24.856570643002566, 67.01037690271161),
  ('Bolton Market', 24.85112176092772, 67.00086053161058),
  ('Keamari', 24.824879867658563, 66.97896675990154),
  ('Gulshan e Hadeed', 24.868619715069162, 67.37357571362921),
  ('Dolmen Mall Clifton', 24.802814022083115, 67.03003022395416),
  ('Clock Tower DHA', 24.778510617605242, 67.05424856810355),
  ('Ibrahim Hyderi', 24.79442154008397, 67.13606280796547),
  ('Hawksbay', 24.862965559476617, 66.84967761520781),
  ('Mauripur', 24.868553828742662, 66.91806479202458),
  ('Gulbai', 24.875849175351338, 66.96771876503854),
  ('Agra Taj', 24.86844537375432, 66.98064692410743),
  ('Daryabad', 24.8606608, 66.9873543),
  ('Jinnah Bridge', 24.8459993, 66.9930716),
  ('CMH Malir Cantt', 24.8600000, 67.0600000),
  ('Quaidabad', 24.8490000, 67.0490000)
  ('Sakhi Hasan', 24.95346773092693, 67.0577716772073),
  ('KDA Chowrangi', 24.931339785000286, 67.03805430797357),
  ('Nazimabad Eid Gah Ground', 24.911661304158386, 67.0299321355882),
  ('Essa Nagri', 24.904502924697898, 67.06771161404112),
  ('National Stadium', 24.891521652393735, 67.08553703439402),
  ('Korangi Road', 24.843171427318385, 67.1423714191224),
  ('Nasir Jump', 24.82074348447435, 67.12512378650825),
  ('Naval Colony', 24.94510604642255, 66.93343911636437),
  ('Baldia', 24.938280342786054, 66.95919155579688),
  ('Sher Shah', 24.889794074012606, 66.98268805350503),
  ('Salah Uddin Ayubi Road', 24.8620086, 67.3231935),
  ('Allah Wali Chowrangi', 24.878662511151656, 67.35457833612021),
  ('National Highway 5', 24.86774363739948, 67.3806745131276),
  ('Steel Mill More', 24.86176186371214, 67.3247927086022),
  ('Port Bin Qasim More', 24.867514916318438, 67.30040074608311),
  ('Razzakabad', 24.864448583667137, 67.2926062355869),
  ('Abdullah Goth', 24.862607858564868, 67.28482340860285),
  ('Chowkundi More', 24.859715198290484, 67.2726854509307),
  ('Fast University', 24.864903966933255, 67.26328225999092),
  ('Bhains Colony More', 24.856146569764956, 67.2583038644228),
  ('Manzil Pump', 24.856368484635514, 67.2298800915836),
  ('Murghi Khana', 24.860382038594647, 67.20762886666442),
  ('Prince Aly Boys School', 24.87002620415032, 67.20030076641423),
  ('Nadra Center Malir', 24.87155834038274, 67.19774873743854),
  ('Malir Session Court', 24.874000938066125, 67.19442124907741),
  ('Malir 15', 24.879576451655517, 67.18843625795418),
  ('Malir Mandir', 24.87536879474882, 67.19306411891512),
  ('Babar Market', 24.84077620147468, 67.18680772139899),
  ('Landhi Road', 24.830788218392907, 67.17171649426147),
  ('Frere Hall', 24.850170841804754, 67.03280105398356),
  ('Teen Talwar', 24.834804669835396, 67.03352149629474),
  ('Do Talwar', 24.821807114571573, 67.03408074925252),
  ('Abdullah Shah Ghazi', 24.812168451656074, 67.03102477672803),
  ('26 Street', 24.788805321842105, 67.06475648570229),
  ('Masjid-e-Ayesha', 24.803143015641453, 67.0779536036348),
  ('Rahat Park', 24.816051589432266, 67.07573591904924),
  ('Korangi Crossing', 24.817919292418487, 67.10782267624361),
  ('CBM University', 24.814603601612163, 67.11755795344367),
  ('Parco', 24.8021314965146, 67.13369954283299),
  ('Miran Nakka', 24.879269182309994, 66.9939555033233),
  ('Gulistan Colony', 24.87747826786594, 66.99011994442583),
  ('Bihar Colony', 24.87428975369484, 66.98993674768367),
  ('Bahria Complex', 24.84711068315875, 66.99665298744345),
  ('M.T.Khan Road', 24.845523424328146, 66.99996946509265),
  ('PICD', 24.84658162935806, 67.02459657117268),
  ('Submarine Chowk', 24.829045313551163, 67.04196050695374),
  ('Bahria Complex 3', 24.84804530606166, 67.00351944254119),
  ('Khadda Market', 24.81309557179293, 67.04955665767567),
  ('Bilawal Chowrangi', 24.81657689173749, 67.02005648379271),
  ('Ziauddin Hospital', 24.81756471688781, 67.00763023441894),
  ('Shireen Jinnah Colony', 24.816150820438022, 66.99432072314538),
  ('Naddi Kinara', 24.909092211656755, 67.21506085953736),
  ('Qayyumabad', 24.829475965200096, 67.08081788895804),
  ('Defence Mor', 24.837960432466872, 67.06761108044533),
  ('National Medical Center', 24.84760431207681, 67.05566052698792),
  ('Gora Qabristan', 24.857521869545582, 67.0481567592421),
  ('Jutt Land', 24.861560937536623, 67.04221071084562),
  ('Lines Area', 24.866131273538716, 67.03947666573598),
  ('Army Public School', 24.89363704742162, 67.12118211684722),
  ('Lucky Star Saddar', 24.85698670802638, 67.0358545814943),
  ('Jinnah Ave', 24.9033517380901, 67.18234907502983),
  ('Airport', 24.8988752740752, 67.17966687662883),
  ('DHA Phase 1', 24.835457905288667, 67.07067271702645),
  ('Bahria Town', 25.013883429418627, 67.3073529580153),
  ('Dumba Goth', 24.856668338781475, 67.00016890371505),
  ('Toll Plaza', 24.997685180709883, 67.2300537596844),
  ('Baqai University', 24.98579969618579, 67.21565768784451),
  ('Malir Cantt Check Post 5', 24.948148576091867, 67.18304277301655),
  ('Malir Cantt Gate 6', 24.93470557979935, 67.17719083017235),
  ('Rim Jhim Tower', 24.94107775192779, 67.16049671905714),
  ('Kamran Chowrangi', 24.924582325286575, 67.1378588576722),
  ('Darul Sehat Hospital', 24.91487759678409, 67.12741038935334),
  ('Millennium Mall', 24.9016004606037, 67.11535353503251),
  ('Dalmia Road', 24.8965479, 67.0991636),
  ('Bahria University', 24.8940444, 67.0879168),
  ('Aga Khan Hospital', 24.8906318, 67.0750727),
  ('Liaquat National Hospital', 24.8896120, 67.0678073),
  ('PIB Colony', 24.8859374, 67.0573530),
  ('Dawood Engineering University', 24.8795444, 67.0478064),
  ('People Secretariat Chowrangi', 24.8768741, 67.0440489),
  ('Jamali Pull', 24.9732052, 67.1183428),
  ('New Sabzi Mandi', 24.9932043, 67.1567624),
  ('DHA City', 25.0200950, 67.3951146);
  ('Yousuf Goth', 24.9576112857523, 66.92807837790974);
ON DUPLICATE KEY UPDATE 
  stop_name = VALUES(stop_name);

-- =============================================================================
-- ROUTES_STOPS MAPPING
-- =============================================================================

-- Capture route IDs (these were created above)
SELECT route_id INTO @r1_red FROM routes WHERE service_id = (SELECT service_id FROM services WHERE service_name='Red-Bus') AND route_name='R1 (Khokrapar - Dockyard)' LIMIT 1;
SELECT route_id INTO @r2_red FROM routes WHERE service_id = (SELECT service_id FROM services WHERE service_name='Red-Bus') AND route_name='R2 (Powerhouse - Indus Hospital)' LIMIT 1;
SELECT route_id INTO @r4_red FROM routes WHERE service_id = (SELECT service_id FROM services WHERE service_name='Red-Bus') AND route_name='R4 (Power House - Keamari)' LIMIT 1;
SELECT route_id INTO @r9_red FROM routes WHERE service_id = (SELECT service_id FROM services WHERE service_name='Red-Bus') AND route_name='R9 (Gulshan e Hadeed - Tower)' LIMIT 1;
SELECT route_id INTO @r10_red FROM routes WHERE service_id = (SELECT service_id FROM services WHERE service_name='Red-Bus') AND route_name='R10 (Numaish - Ibrahim Hyderi)' LIMIT 1;
SELECT route_id INTO @r13_red FROM routes WHERE service_id = (SELECT service_id FROM services WHERE service_name='Red-Bus') AND route_name='R13 (Hawksbay - Tower)' LIMIT 1;
SELECT route_id INTO @ev1 FROM routes WHERE service_id = (SELECT service_id FROM services WHERE service_name='EV-Bus') AND route_name='EV1 (Malir Cantt - Dolmen Mall Clifton)' LIMIT 1;

-- R1 (Red-Bus) stops
SELECT stop_id INTO @s_khokrapar FROM stops WHERE stop_name='Khokrapar' LIMIT 1;
SELECT stop_id INTO @s_saudabad FROM stops WHERE stop_name='Saudabad' LIMIT 1;
SELECT stop_id INTO @s_rcd FROM stops WHERE stop_name='RCD Ground' LIMIT 1;
SELECT stop_id INTO @s_kalaboard FROM stops WHERE stop_name='Kalaboard' LIMIT 1;
SELECT stop_id INTO @s_malir_halt FROM stops WHERE stop_name='Malir Halt' LIMIT 1;
SELECT stop_id INTO @s_colony_gate FROM stops WHERE stop_name='Colony Gate' LIMIT 1;
SELECT stop_id INTO @s_nata FROM stops WHERE stop_name='Nata Khan' LIMIT 1;
SELECT stop_id INTO @s_drigh FROM stops WHERE stop_name='Drigh Road' LIMIT 1;
SELECT stop_id INTO @s_paf FROM stops WHERE stop_name='PAF Base Faisal' LIMIT 1;
SELECT stop_id INTO @s_laal FROM stops WHERE stop_name='Laal Kothi' LIMIT 1;
SELECT stop_id INTO @s_karsaz FROM stops WHERE stop_name='Karsaz' LIMIT 1;
SELECT stop_id INTO @s_nursery FROM stops WHERE stop_name='Nursery' LIMIT 1;
SELECT stop_id INTO @s_ftc FROM stops WHERE stop_name='FTC' LIMIT 1;
SELECT stop_id INTO @s_regent FROM stops WHERE stop_name='Regent Plaza' LIMIT 1;
SELECT stop_id INTO @s_metropole FROM stops WHERE stop_name='Metropole' LIMIT 1;
SELECT stop_id INTO @s_fawwara FROM stops WHERE stop_name='Fawwara Chowk' LIMIT 1;
SELECT stop_id INTO @s_artsc FROM stops WHERE stop_name='Arts Council' LIMIT 1;
SELECT stop_id INTO @s_shaheen FROM stops WHERE stop_name='Shaheen Complex' LIMIT 1;
SELECT stop_id INTO @s_iich FROM stops WHERE stop_name='I.I.Chundrigar' LIMIT 1;
SELECT stop_id INTO @s_tower FROM stops WHERE stop_name='Tower' LIMIT 1;
SELECT stop_id INTO @s_fisheries FROM stops WHERE stop_name='Fisheries' LIMIT 1;
SELECT stop_id INTO @s_dockyard FROM stops WHERE stop_name='Dockyard' LIMIT 1;

INSERT INTO routes_stops (route_id, stop_id, stop_order) VALUES
  (@r1_red, @s_khokrapar, 1),
  (@r1_red, @s_saudabad, 2),
  (@r1_red, @s_rcd, 3),
  (@r1_red, @s_kalaboard, 4),
  (@r1_red, @s_malir_halt, 5),
  (@r1_red, @s_colony_gate, 6),
  (@r1_red, @s_nata, 7),
  (@r1_red, @s_drigh, 8),
  (@r1_red, @s_paf, 9),
  (@r1_red, @s_laal, 10),
  (@r1_red, @s_karsaz, 11),
  (@r1_red, @s_nursery, 12),
  (@r1_red, @s_ftc, 13),
  (@r1_red, @s_regent, 14),
  (@r1_red, @s_metropole, 15),
  (@r1_red, @s_fawwara, 16),
  (@r1_red, @s_artsc, 17),
  (@r1_red, @s_shaheen, 18),
  (@r1_red, @s_iich, 19),
  (@r1_red, @s_tower, 20),
  (@r1_red, @s_fisheries, 21),
  (@r1_red, @s_dockyard, 22)
ON DUPLICATE KEY UPDATE stop_order = VALUES(stop_order);

-- R2 stops
SELECT stop_id INTO @s_powerhouse FROM stops WHERE stop_name='Power House Chowrangi Station' LIMIT 1;
SELECT stop_id INTO @s_upmor FROM stops WHERE stop_name='UP Mor' LIMIT 1;
SELECT stop_id INTO @s_nagan FROM stops WHERE stop_name='Nagan Chowrangi' LIMIT 1;
SELECT stop_id INTO @s_shafiq FROM stops WHERE stop_name='Shafiq Morr' LIMIT 1;
SELECT stop_id INTO @s_sohrab FROM stops WHERE stop_name='Sohrab Goth' LIMIT 1;
SELECT stop_id INTO @s_gulshanch FROM stops WHERE stop_name='Gulshan Chowrangi' LIMIT 1;
SELECT stop_id INTO @s_nipa FROM stops WHERE stop_name='NIPA' LIMIT 1;
SELECT stop_id INTO @s_johar FROM stops WHERE stop_name='Johar Morr' LIMIT 1;
SELECT stop_id INTO @s_cod FROM stops WHERE stop_name='COD' LIMIT 1;
SELECT stop_id INTO @s_indush FROM stops WHERE stop_name='Indus Hospital' LIMIT 1;

INSERT INTO routes_stops (route_id, stop_id, stop_order) VALUES
  (@r2_red, @s_powerhouse, 1),
  (@r2_red, @s_upmor, 2),
  (@r2_red, @s_nagan, 3),
  (@r2_red, @s_shafiq, 4),
  (@r2_red, @s_sohrab, 5),
  (@r2_red, @s_gulshanch, 6),
  (@r2_red, @s_nipa, 7),
  (@r2_red, @s_johar, 8),
  (@r2_red, @s_cod, 9),
  (@r2_red, @s_drigh, 10),
  (@r2_red, @s_colony_gate, 11),
  (@r2_red, @s_indush, 12)
ON DUPLICATE KEY UPDATE stop_order = VALUES(stop_order);

-- R4 stops
SELECT stop_id INTO @s_waterpump FROM stops WHERE stop_name='Water Pump' LIMIT 1;
SELECT stop_id INTO @s_ayesha FROM stops WHERE stop_name='Ayesha Manzil' LIMIT 1;
SELECT stop_id INTO @s_karimabad FROM stops WHERE stop_name='Karimabad' LIMIT 1;
SELECT stop_id INTO @s_numaish FROM stops WHERE stop_name='Numaish Chowrangi' LIMIT 1;
SELECT stop_id INTO @s_mobile FROM stops WHERE stop_name='Mobile Market' LIMIT 1;
SELECT stop_id INTO @s_keamari FROM stops WHERE stop_name='Keamari' LIMIT 1;

INSERT INTO routes_stops (route_id, stop_id, stop_order) VALUES
  (@r4_red, @s_powerhouse, 1),
  (@r4_red, @s_upmor, 2),
  (@r4_red, @s_nagan, 3),
  (@r4_red, @s_shafiq, 4),
  (@r4_red, @s_sohrab, 5),
  (@r4_red, @s_waterpump, 6),
  (@r4_red, @s_ayesha, 7),
  (@r4_red, @s_karimabad, 8),
  (@r4_red, @s_numaish, 9),
  (@r4_red, @s_mobile, 10),
  (@r4_red, @s_keamari, 11)
ON DUPLICATE KEY UPDATE stop_order = VALUES(stop_order);

-- R9 stops
SELECT stop_id INTO @s_gulshane FROM stops WHERE stop_name='Gulshan e Hadeed' LIMIT 1;
SELECT stop_id INTO @s_quaidabad FROM stops WHERE stop_name='Quaidabad' LIMIT 1;

INSERT INTO routes_stops (route_id, stop_id, stop_order) VALUES
  (@r9_red, @s_gulshane, 1),
  (@r9_red, @s_quaidabad, 2),
  (@r9_red, @s_kalaboard, 3),
  (@r9_red, @s_malir_halt, 4),
  (@r9_red, @s_colony_gate, 5),
  (@r9_red, @s_nata, 6),
  (@r9_red, @s_drigh, 7),
  (@r9_red, @s_paf, 8),
  (@r9_red, @s_laal, 9),
  (@r9_red, @s_karsaz, 10),
  (@r9_red, @s_nursery, 11),
  (@r9_red, @s_ftc, 12),
  (@r9_red, @s_regent, 13),
  (@r9_red, @s_metropole, 14),
  (@r9_red, @s_fawwara, 15),
  (@r9_red, @s_artsc, 16),
  (@r9_red, @s_shaheen, 17),
  (@r9_red, @s_iich, 18),
  (@r9_red, @s_tower, 19)
ON DUPLICATE KEY UPDATE stop_order = VALUES(stop_order);

-- R10 stops
SELECT stop_id INTO @s_numaish2 FROM stops WHERE stop_name='Numaish Chowrangi' LIMIT 1;
SELECT stop_id INTO @s_metropole2 FROM stops WHERE stop_name='Metropole' LIMIT 1;
SELECT stop_id INTO @s_dolmen FROM stops WHERE stop_name='Dolmen Mall Clifton' LIMIT 1;
SELECT stop_id INTO @s_ibh FROM stops WHERE stop_name='Ibrahim Hyderi' LIMIT 1;

INSERT INTO routes_stops (route_id, stop_id, stop_order) VALUES
  (@r10_red, @s_numaish2, 1),
  (@r10_red, @s_metropole2, 2),
  (@r10_red, @s_dolmen, 3),
  (@r10_red, @s_ibh, 4)
ON DUPLICATE KEY UPDATE stop_order = VALUES(stop_order);

-- EV1 stops
SELECT stop_id INTO @s_cmh FROM stops WHERE stop_name='CMH Malir Cantt' LIMIT 1;
SELECT stop_id INTO @s_tank FROM stops WHERE stop_name='Tank Chowk' LIMIT 1;
SELECT stop_id INTO @s_colony FROM stops WHERE stop_name='Colony Gate' LIMIT 1;
SELECT stop_id INTO @s_dolmen2 FROM stops WHERE stop_name='Dolmen Mall Clifton' LIMIT 1;

INSERT INTO routes_stops (route_id, stop_id, stop_order) VALUES
  (@ev1, @s_cmh, 1),
  (@ev1, @s_tank, 2),
  (@ev1, @s_colony, 3),
  (@ev1, @s_dolmen2, 4)
ON DUPLICATE KEY UPDATE stop_order = VALUES(stop_order);

-- R13 stops
SELECT stop_id INTO @s_hawks FROM stops WHERE stop_name='Hawksbay' LIMIT 1;
SELECT stop_id INTO @s_mauripur FROM stops WHERE stop_name='Mauripur' LIMIT 1;
SELECT stop_id INTO @s_gulbai FROM stops WHERE stop_name='Gulbai' LIMIT 1;
SELECT stop_id INTO @s_agra FROM stops WHERE stop_name='Agra Taj' LIMIT 1;
SELECT stop_id INTO @s_dary FROM stops WHERE stop_name='Daryabad' LIMIT 1;
SELECT stop_id INTO @s_jbridge FROM stops WHERE stop_name='Jinnah Bridge' LIMIT 1;

INSERT INTO routes_stops (route_id, stop_id, stop_order) VALUES
  (@r13_red, @s_hawks, 1),
  (@r13_red, @s_mauripur, 2),
  (@r13_red, @s_gulbai, 3),
  (@r13_red, @s_agra, 4),
  (@r13_red, @s_dary, 5),
  (@r13_red, @s_jbridge, 6),
  (@r13_red, @s_tower, 7)
ON DUPLICATE KEY UPDATE stop_order = VALUES(stop_order);