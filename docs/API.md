# API Reference (developer-focused)

Auth (important)
- Session-based via Flask `session`. Login sets a session cookie.
- Client must call `fetch(..., credentials: 'include')` for requests that rely on the session.
- Admin endpoints require `session['role'] === 'admin'`.

Common response patterns
- Success: { "success": true, ... }
- Error:   { "success": false, "message": "..." }
- Pagination: { "items": [...], "total": <number>, "page": <number>, "per_page": <number> }

## Public API Endpoints

### Authentication
- **POST** `/api/login`
	- Request JSON: { "identifier": "user@example.com", "password": "secret" }
	- Success response: {
			"success": true,
			"message": "Login successful!",
			"username": "alice",
			"email": "user@example.com",
			"role": "admin"
		}
	- Notes: sets session cookie on success.

- **POST** `/api/logout`
	- Success: { "success": true, "message": "Logged out successfully" }

- **POST** `/api/register`
	- Request JSON: { "user_name": "alice", "name": "Alice B", "email": "a@x.com", "password": "pw" }
	- Success: { "success": true, "message": "You have successfully registered!" }

- **GET** `/api/auth/check`
	- Check if user is authenticated
	- Success: { "success": true, "user": {...} }

- **GET** `/api/users`
	- **DEVELOPMENT ENDPOINT ONLY** - Returns all users without authentication
	- Success: { "users": [ { "user_id": 1, "username": "alice", ... }, ... ] }

### Services & Routes
- **GET** `/api/services/<int:service_id>/routes`
	- Success response: { "success": true, "routes": [ { "route_id": 1, "route_name": "A→B", "service_id": 3 }, ... ] }

- **GET** `/api/services/<int:service_id>/stops`
	- Get all stops for a service
	- Success: { "success": true, "stops": [...] }

- **GET** `/api/services/<int:service_id>/routes/matching`
	- Get routes matching certain criteria
	- Success: { "success": true, "routes": [...] }

- **GET** `/api/routes/<int:route_id>/stops`
	- Get stops for a specific route
	- Success: { "success": true, "stops": [...] }

### Trips & Bookings
- **GET** `/api/routes/<int:route_id>/trips/availability`
	- Success response: { "success": true, "trips": [ { "trip_id": 10, "bus_id": 2, "departure_time": "2025-11-22T10:00:00", "arrival_time": "...", "status": "scheduled", "number_plate": "ABC-123", "capacity": 40, "booked": 5, "available": 35 }, ... ] }

- **POST** `/api/bookings`
	- Request JSON: { "trip_id": 10, "boarding_stop_id": 21, "alighting_stop_id": 24 }
	- Success response (example): { "success": true, "booking_id": 123, "fare_amount": 50.0, "seat_number": 12 }

### Utility Endpoints
- **GET** `/api/calculate_fare?start_stop_id=2&end_stop_id=5&route_id=1&direction=forward`
	- Calculate fare between stops
	- Success: { "success": true, "fare": 50.0 }

- **POST** `/api/validate_payment`
	- Validate payment information
	- Request: { "card_number": "...", "expiry": "...", "cvv": "..." }
	- Success: { "success": true, "valid": true }

- **GET** `/api/test_cards`
	- Get test card data for development
	- Success: { "success": true, "cards": [...] }

## Admin API Endpoints (prefix: /admin)

Authentication: all admin routes are protected by `@admin_required` (session check + role).

### Users Management
- **GET** `/admin/users` - List all users (paginated)
- **GET** `/admin/users/<int:user_id>` - Get specific user
- **POST** `/admin/users` - Create new user
- **PUT/PATCH** `/admin/users/<int:user_id>` - Update user
- **DELETE** `/admin/users/<int:user_id>` - Delete user

### Drivers Management
- **GET** `/admin/drivers` - List all drivers (paginated)
- **GET** `/admin/drivers/<int:driver_id>` - Get specific driver
- **POST** `/admin/drivers` - Create new driver
- **PUT/PATCH** `/admin/drivers/<int:driver_id>` - Update driver
- **DELETE** `/admin/drivers/<int:driver_id>` - Delete driver

### Driver Assignments
- **GET** `/admin/drivers-assignments` - List all assignments (paginated)
- **GET** `/admin/drivers-assignments/drivers` - Get drivers with assignments
- **GET** `/admin/drivers-assignments/buses` - Get buses with assignments
- **POST** `/admin/drivers-assignments` - Create new assignment
- **PUT/PATCH** `/admin/drivers-assignments/<int:driver_id>/<int:bus_id>/<path:start_time>` - Update assignment
- **DELETE** `/admin/drivers-assignments/<int:driver_id>/<int:bus_id>/<path:start_time>` - Delete assignment

### Buses Management
- **GET** `/admin/buses` - List all buses (paginated)
- **GET** `/admin/buses/<int:bus_id>` - Get specific bus
- **POST** `/admin/buses` - Create new bus
- **PUT/PATCH** `/admin/buses/<int:bus_id>` - Update bus
- **DELETE** `/admin/buses/<int:bus_id>` - Delete bus

### Routes Management
- **GET** `/admin/routes` - List all routes (paginated)
- **GET** `/admin/routes/<int:route_id>` - Get specific route
- **POST** `/admin/routes` - Create new route
- **PUT/PATCH** `/admin/routes/<int:route_id>` - Update route
- **DELETE** `/admin/routes/<int:route_id>` - Delete route

### Services Management
- **GET** `/admin/services` - List all services (paginated)
- **GET** `/admin/services/<int:service_id>` - Get specific service
- **POST** `/admin/services` - Create new service
- **PUT/PATCH** `/admin/services/<int:service_id>` - Update service
- **DELETE** `/admin/services/<int:service_id>` - Delete service

### Stops Management
- **GET** `/admin/stops` - List all stops (paginated)
- **GET** `/admin/stops/<int:stop_id>` - Get specific stop
- **POST** `/admin/stops` - Create new stop
- **PUT/PATCH** `/admin/stops/<int:stop_id>` - Update stop
- **DELETE** `/admin/stops/<int:stop_id>` - Delete stop

### Route-Stops Management
- **GET** `/admin/routes-stops` - List all route-stop associations (paginated)
- **GET** `/admin/routes-stops/routes` - Get routes with stops
- **GET** `/admin/routes-stops/stops` - Get stops with routes
- **GET** `/admin/routes-stops/<int:route_id>/<int:stop_id>` - Get specific association
- **POST** `/admin/routes-stops` - Create route-stop association
- **PUT/PATCH** `/admin/routes-stops/<int:route_id>/<int:stop_id>` - Update association
- **DELETE** `/admin/routes-stops/<int:route_id>/<int:stop_id>` - Delete association

### Trips Management
- **GET** `/admin/trips` - List all trips (paginated)
- **GET** `/admin/trips/<int:trip_id>` - Get specific trip
- **POST** `/admin/trips` - Create new trip
- **PUT/PATCH** `/admin/trips/<int:trip_id>` - Update trip
- **DELETE** `/admin/trips/<int:trip_id>` - Delete trip
- **POST** `/admin/trips/generate-daily` - Generate daily trips
- **POST** `/admin/trips/clear-daily` - Clear daily trips

### Bus Control & Real-Time Management
- **POST** `/admin/trips/<int:trip_id>/start` - Start a trip manually
- **POST** `/admin/trips/<int:trip_id>/stop` - Stop a trip manually
- **GET** `/admin/trips/<int:trip_id>/status` - Get trip status
- **GET** `/admin/trips/active` - Get all active trips
- **GET** `/admin/debug/time` - Get current system time (debug)

### Bookings Management
- **GET** `/admin/bookings` - List all bookings (paginated)
- **GET** `/admin/bookings/<int:booking_id>` - Get specific booking
- **POST** `/admin/bookings` - Create new booking
- **PUT** `/admin/bookings/<int:booking_id>` - Update booking
- **DELETE** `/admin/bookings/<int:booking_id>` - Delete booking
- **GET** `/admin/bookings/users` - Get bookings by users
- **GET** `/admin/bookings/trips` - Get bookings by trips
- **GET** `/admin/bookings/stops` - Get bookings by stops

### Tickets Management
- **GET** `/admin/tickets` - List all tickets (paginated)
- **GET** `/admin/tickets/<int:ticket_id>` - Get specific ticket

### Payments Management
- **GET** `/admin/payments` - List all payments (paginated)
- **GET** `/admin/payments/<int:payment_id>` - Get specific payment

### Reports & Analytics
- **GET** `/admin/reports/bookings/daily` - Daily booking reports
- **GET** `/admin/reports/bookings/status` - Booking status reports
- **GET** `/admin/reports/revenue/daily` - Daily revenue reports
- **GET** `/admin/reports/revenue/total` - Total revenue reports
- **GET** `/admin/reports/trips/summary-by-route` - Trip summaries by route
- **GET** `/admin/reports/top_routes` - Top performing routes
- **GET** `/admin/reports/summary` - General summary report
- **GET** `/admin/reports/dashboard` - Dashboard analytics
- **GET** `/admin/reports/users` - User reports
- **GET** `/admin/reports/bus-utilization` - Bus utilization reports
- **GET** `/admin/reports/payments` - Payment reports
- **GET** `/admin/reports/peak-hours` - Peak hours analysis
- **GET** `/admin/reports/route-performance` - Route performance metrics
- **GET** `/admin/reports/trip-revenue/<int:trip_id>` - Revenue for specific trip
- **GET** `/admin/reports/daily-analytics` - Daily analytics
- **GET** `/admin/reports/user-profile/<int:user_id>` - User profile reports

## Error Codes & HTTP Status

- **401 Unauthorized**: Not logged in or session expired
- **403 Forbidden**: Logged in but insufficient permissions (not admin for admin endpoints)
- **400 Bad Request**: Validation errors, malformed requests (response includes `message` field)
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (e.g., duplicate entries)
- **500 Internal Server Error**: Backend exception or database error

## Development Notes

- Backend CORS permits `http://localhost:5173` and `http://127.0.0.1:5173` for `/api/*` and `/admin/*` with credentials
- All admin endpoints require authentication and admin role
- Pagination parameters: `page` (default: 1), `per_page` (default: varies by endpoint)
- Date/time fields use ISO 8601 format (YYYY-MM-DDTHH:MM:SS)
- For detailed field specifications, inspect route handlers in `backend/admin/` and repository modules in `backend/admin/repos/`
- WebSocket events are available for real-time updates (see Real-Time Features section)

## Real-Time Features & WebSocket Events

The system provides real-time updates through WebSocket events for live bus tracking and trip management.

### WebSocket Events

#### Trip Started
```javascript
socket.on('trip_started', (data) => {
  // {
  //   trip_id: 123,
  //   route_id: 1,
  //   route_name: "Route A",
  //   current_stop_index: 0,
  //   current_stop_name: "Stop 1",
  //   total_stops: 10,
  //   direction: "forward"
  // }
});
```

#### Trip Position Update
```javascript
socket.on('trip_position_update', (data) => {
  // {
  //   trip_id: 123,
  //   current_stop_index: 5,
  //   current_stop_id: 21,
  //   current_stop_name: "Central Station",
  //   total_stops: 10
  // }
});
```

#### Trip Stopped
```javascript
socket.on('trip_stopped', (data) => {
  // { trip_id: 123 }
});
```

#### Trip Completed
```javascript
socket.on('trip_completed', (data) => {
  // {
  //   trip_id: 123,
  //   trip: { /* full trip object */ }
  // }
});
```

#### Trip Removed
```javascript
socket.on('trip_removed', (data) => {
  // { trip_id: 123 }
  // Emitted when a trip is removed from active tracking (e.g., during system sync)
});
```

#### Return Trip Created (Auto-Return Feature)
```javascript
socket.on('return_trip_created', (data) => {
  // {
  //   original_trip_id: 123,
  //   new_trip_id: 124,
  //   bus_id: 5,
  //   route_id: 1,
  //   direction: "backward",
  //   departure_time: "2025-01-05T10:45:30",
  //   trip: { /* full trip object */ }
  // }
});
```

### Auto-Return Trip Configuration

#### Get Configuration
- **GET** `/admin/trips/auto-return/config`
- **Auth**: Admin required
- **Response**:
```json
{
  "success": true,
  "auto_return_enabled": true,
  "return_buffer_seconds": 30
}
```

#### Update Configuration
- **PUT** `/admin/trips/auto-return/config`
- **Auth**: Admin required
- **Request**:
```json
{
  "auto_return_enabled": true,
  "return_buffer_seconds": 60
}
```
- **Parameters**:
  - `auto_return_enabled` (boolean): Enable/disable automatic return trips
  - `return_buffer_seconds` (integer): Buffer time in seconds (0-3600)

### How Auto-Return Works

1. **Trip Completion**: When bus reaches final stop → status = 'completed'
2. **Buffer Wait**: System waits configured buffer time (default: 30 seconds)
3. **Auto-Creation**: New trip created with:
   - Same bus & route
   - Opposite direction
   - Departure time = current time + buffer
   - Status = 'scheduled'
4. **Notification**: WebSocket `return_trip_created` event sent

### Direction-Aware Features

Trips support bidirectional travel with `direction` field ("forward" or "backward"). Routes can be traversed in both directions with automatic stop ordering.
