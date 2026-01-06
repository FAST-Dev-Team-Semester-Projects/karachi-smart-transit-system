from flask_mysqldb import MySQL
import MySQLdb.cursors
from math import radians, sin, cos, sqrt, atan2


# Haversine distance calculator (in kilometers)
def calculate_distance(lat1, lon1, lat2, lon2):
    radius_earth = 6371  # Earth radius in km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    )
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return radius_earth * c


# Main fare calculation logic - handles both Green Line and Red Bus
def calculate_fare(mysql, start_stop_id, end_stop_id, route_id=None, direction=None):
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)

    # Get route and service information
    if route_id:
        cursor.execute(
            """
            SELECT r.route_id, r.service_id, s.service_name
            FROM routes r
            JOIN services s ON r.service_id = s.service_id
            WHERE r.route_id = %s
            """,
            (route_id,)
        )
        route_info = cursor.fetchone()
        if not route_info:
            raise ValueError("Route not found")
        
        service_id = route_info['service_id']
        service_name = route_info['service_name']
    else:
        # Try to find a common route for both stops
        cursor.execute(
            """
            SELECT r.route_id, r.service_id, s.service_name
            FROM routes_stops rs1
            JOIN routes_stops rs2 ON rs1.route_id = rs2.route_id
            JOIN routes r ON rs1.route_id = r.route_id
            JOIN services s ON r.service_id = s.service_id
            WHERE rs1.stop_id = %s AND rs2.stop_id = %s
            LIMIT 1
            """,
            (start_stop_id, end_stop_id)
        )
        route_info = cursor.fetchone()
        if not route_info:
            raise ValueError("No common route found for these stops")
        
        route_id = route_info['route_id']
        service_id = route_info['service_id']
        service_name = route_info['service_name']

    # Get stop details with coordinates and order
    cursor.execute(
        """
        SELECT rs.stop_id, rs.stop_order, s.stop_name, s.latitude, s.longitude
        FROM routes_stops rs
        JOIN stops s ON rs.stop_id = s.stop_id
        WHERE rs.route_id = %s AND rs.stop_id IN (%s, %s)
        ORDER BY rs.stop_order
        """,
        (route_id, start_stop_id, end_stop_id),
    )
    stops = cursor.fetchall()

    if len(stops) != 2:
        raise ValueError("Invalid stop IDs or stops not on same route")

    # Get start and end stops
    start_stop = stops[0] if stops[0]['stop_id'] == start_stop_id else stops[1]
    end_stop = stops[1] if stops[1]['stop_id'] == end_stop_id else stops[0]
    
    start_order = start_stop['stop_order']
    end_order = end_stop['stop_order']
    
    # Auto-detect direction based on stop order
    if end_order > start_order:
        detected_direction = 'forward'
        stops_count = end_order - start_order
    elif end_order < start_order:
        detected_direction = 'backward'
        stops_count = start_order - end_order
    else:
        raise ValueError("Pickup and drop-off cannot be the same stop")
    
    # If direction was provided, validate it matches
    if direction and direction != detected_direction:
        raise ValueError(f"Stop order indicates {detected_direction} direction, but {direction} was specified")
    
    # Calculate distance between stops
    distance = calculate_distance(
        start_stop['latitude'], start_stop['longitude'],
        end_stop['latitude'], end_stop['longitude']
    )
    
    # Determine fare based on service type
    # BRT Lines (service_id 1-6): Distance-based pricing
    # Red Bus / Peoples Bus Service (service_id 7+): Different pricing
    
    if service_id <= 6:  # BRT Lines (Green, Orange, Red, Yellow, Blue, Brown)
        # BRT Distance-based pricing table:
        # Till 2 km: Rs. 15
        # 2-4 km: Rs. 20
        # 4-6 km: Rs. 25
        # 6-8 km: Rs. 30
        # 8-10 km: Rs. 35
        # 10-12 km: Rs. 40
        # 12-14 km: Rs. 45
        # 14-16 km: Rs. 50
        # Over 16 km: Rs. 55
        
        if distance <= 2:
            fare = 15
        elif distance <= 4:
            fare = 20
        elif distance <= 6:
            fare = 25
        elif distance <= 8:
            fare = 30
        elif distance <= 10:
            fare = 35
        elif distance <= 12:
            fare = 40
        elif distance <= 14:
            fare = 45
        elif distance <= 16:
            fare = 50
        else:  # Over 16 km
            fare = 55
        
        cursor.close()
        return {
            "service_name": service_name,
            "pricing_type": "distance-based",
            "direction": detected_direction,
            "distance_km": round(distance, 2),
            "stops_count": stops_count,
            "fare_amount": fare,
            "start_stop": start_stop['stop_name'],
            "end_stop": end_stop['stop_name']
        }
    
    else:  # Red Bus / Peoples Bus Service (distance-based)
        # Distance-based pricing
        # - ≤15 km: 80 Rs
        # - >15 km: 120 Rs
        
        fare = 80 if distance <= 15 else 120
        
        cursor.close()
        return {
            "service_name": service_name,
            "pricing_type": "distance-based",
            "direction": detected_direction,
            "distance_km": round(distance, 2),
            "stops_count": stops_count,
            "fare_amount": fare,
            "start_stop": start_stop['stop_name'],
            "end_stop": end_stop['stop_name']
        }
