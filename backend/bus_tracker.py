from datetime import datetime, timedelta, timezone
from threading import Thread, Lock
import time
from typing import Dict, Optional, List
import MySQLdb.cursors


class BusTracker:
    """
    Singleton class to track active bus trips in real-time
    """

    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        # Active trips: {trip_id: trip_data}
        self.active_trips: Dict[int, Dict] = {}
        self.trips_lock = Lock()

        # SocketIO instance (set from app.py)
        self.socketio = None

        # Background thread for updating bus positions
        self.update_thread = None
        self.running = False

        # Scheduler thread for auto-starting scheduled trips
        self.scheduler_thread = None
        self.scheduler_running = False

        # Auto-return trip configuration
        # Default to True to enable automatic return trips after arrival. Admin endpoint `/admin/trips/auto-return/config`
        # can toggle this at runtime.
        self.auto_return_enabled = True  # Enable/disable auto-return trips
        self.return_buffer_seconds = 30  # Buffer time before creating return trip

        # Recovery flag to prevent duplicate recovery
        self.recovery_completed = False

        # Sync throttling to avoid excessive DB queries
        self.last_sync_time = None
        self.sync_interval_seconds = 10  # Minimum seconds between syncs

    def set_socketio(self, socketio):
        """Set the SocketIO instance for emitting events"""
        self.socketio = socketio
        # Ensure scheduler thread is running once socket/app are ready
        self._ensure_scheduler_thread()
        print("set_socketio called - Scheduler thread ensured (if not already running)")
        # Recover any running trips from database on startup
        if hasattr(self, "_recover_running_trips"):
            self._recover_running_trips()
        else:
            print("Recovery method not available, skipping trip recovery")

    def _ensure_scheduler_thread(self):
        """Start the scheduler thread if it's not already running"""
        if not self.scheduler_running:
            self.scheduler_running = True
            self.scheduler_thread = Thread(
                target=self._auto_start_scheduled_trips, daemon=True
            )
            self.scheduler_thread.start()

    def start_trip(
        self,
        trip_id: int,
        route_stops: List[Dict],
        mysql,
        direction: str = "forward",
        route_id: int = None,
        route_name: str = None,
    ) -> bool:
        """
        Start a bus trip
        route_stops: list of {stop_id, stop_name, stop_order} (already ordered by direction)
        direction: 'forward' or 'backward'
        route_id: ID of the route for this trip
        route_name: Name of the route for display
        """
        if not route_stops:
            return False

        with self.trips_lock:
            if trip_id in self.active_trips:
                return False  # Already running

            # Initialize trip data
            actual_start_time = datetime.now()
            self.active_trips[trip_id] = {
                "trip_id": trip_id,
                "route_id": route_id,
                "route_name": route_name,
                "direction": direction,
                "route_stops": route_stops,  # Already ordered correctly
                "current_stop_index": 0,
                "current_stop_id": route_stops[0]["stop_id"],
                "current_stop_name": route_stops[0]["stop_name"],
                "started_at": actual_start_time,
                "last_update": actual_start_time,
                "status": "running",
                "total_stops": len(route_stops),
            }

            # Update trip status in database
            try:
                cursor = mysql.connection.cursor()
                cursor.execute(
                    "UPDATE trips SET status = 'running', departure_time = %s WHERE trip_id = %s",
                    (actual_start_time, trip_id),
                )
                mysql.connection.commit()
                cursor.close()
            except Exception as e:
                print(f"start_trip: Failed updating DB status for trip {trip_id}: {e}")

            # Emit to all connected clients
            if self.socketio:
                self.socketio.emit(
                    "trip_started",
                    {
                        "trip_id": trip_id,
                        "route_id": route_id,
                        "route_name": route_name,
                        "current_stop_index": 0,
                        "current_stop_name": route_stops[0]["stop_name"],
                        "total_stops": len(route_stops),
                    },
                    namespace="/",
                )
                # Debug: log that trip has been added to in-memory tracker
                print(
                    f"start_trip: Trip #{trip_id} (route_id={route_id}) started (direction={direction}) - active_trips={len(self.active_trips)}"
                )

            # Start background thread if not running
            if not self.running:
                self.running = True
                self.update_thread = Thread(target=self._update_positions, daemon=True)
                self.update_thread.start()

            return True

    def stop_trip(self, trip_id: int, mysql) -> bool:
        """Manually stop a trip"""
        with self.trips_lock:
            if trip_id not in self.active_trips:
                return False

            trip = self.active_trips[trip_id]
            trip["status"] = "stopped"

            # Update database and cancel any scheduled return trips that reference this trip
            try:
                cursor = mysql.connection.cursor()
                cursor.execute(
                    "UPDATE trips SET status = 'cancelled' WHERE trip_id = %s",
                    (trip_id,),
                )
                mysql.connection.commit()
                # Best-effort: cancel scheduled return trips that have origin_trip_id = this trip
                try:
                    cursor.execute(
                        "UPDATE trips SET status = 'cancelled' WHERE origin_trip_id = %s AND status = 'scheduled'",
                        (trip_id,),
                    )
                    mysql.connection.commit()
                except Exception:
                    # origin_trip_id may not exist in older DB schemas; ignore
                    pass
                cursor.close()
            except Exception as e:
                # Log database errors during trip cancellation
                print(f"cancel_trip: Failed to update database for trip {trip_id}: {e}")

            # Remove from active trips
            del self.active_trips[trip_id]

            # Emit to clients
            if self.socketio:
                self.socketio.emit("trip_stopped", {"trip_id": trip_id}, namespace="/")

            return True

    def get_trip_status(self, trip_id: int) -> Optional[Dict]:
        """Get current status of a trip"""
        with self.trips_lock:
            return self.active_trips.get(trip_id)

    def get_all_active_trips(self) -> List[Dict]:
        """Get all active trips"""
        with self.trips_lock:
            return list(self.active_trips.values())

    def is_trip_available_for_boarding(
        self, trip_id: int, boarding_stop_id: int
    ) -> bool:
        """
        Check if a trip is still available for boarding at a specific stop
        Returns False if the bus has already passed that stop
        """
        with self.trips_lock:
            if trip_id not in self.active_trips:
                return True  # Not started yet, so available

            trip = self.active_trips[trip_id]
            current_stop_index = trip["current_stop_index"]

            # Find the boarding stop index
            boarding_stop_index = None
            for idx, stop in enumerate(trip["route_stops"]):
                if stop["stop_id"] == boarding_stop_id:
                    boarding_stop_index = idx
                    break

            if boarding_stop_index is None:
                return False  # Stop not on this route

            # Available if bus hasn't reached the boarding stop yet
            return current_stop_index <= boarding_stop_index

    def _update_positions(self):
        """Background thread to update bus positions every 15 seconds"""
        from app import app, mysql

        while self.running:
            time.sleep(15)  # Wait 15 seconds between updates

            with app.app_context():
                with self.trips_lock:
                    trips_to_remove = []

                    for trip_id, trip in self.active_trips.items():

                        if trip["status"] != "running":
                            continue

                        # Move to next stop
                        old_index = trip["current_stop_index"]
                        trip["current_stop_index"] += 1
                        trip["last_update"] = datetime.now()

                        # Check if reached final stop
                        if trip["current_stop_index"] >= trip["total_stops"]:
                            # CRITICAL: Update database FIRST before changing memory state
                            # This ensures DB is source of truth and prevents desynchronization
                            try:
                                # Use a fresh DB connection inside this background thread to avoid shared connection issues
                                try:
                                    from admin import get_mysql as admin_get_mysql

                                    db = admin_get_mysql()
                                except Exception:
                                    db = mysql
                                cursor = db.connection.cursor()
                                cursor.execute(
                                    "UPDATE trips SET status = 'completed', arrival_time = %s WHERE trip_id = %s",
                                    (datetime.now(), trip_id),
                                )
                                db.connection.commit()
                                cursor.close()
                                print(
                                    f"Trip #{trip_id} marked as completed in database"
                                )

                                # ONLY proceed if DB update succeeded
                                trip["status"] = "completed"
                                trips_to_remove.append(trip_id)

                                # Emit enriched completion event
                                try:
                                    cursor_meta = db.connection.cursor(
                                        MySQLdb.cursors.DictCursor
                                    )
                                    cursor_meta.execute(
                                        "SELECT v.trip_id, v.bus_id, v.number_plate, v.route_id, v.route_name, v.direction, v.departure_time, v.arrival_time, v.trip_status as status, v.confirmed_bookings, v.available_seats FROM trip_details_view v WHERE v.trip_id = %s",
                                        (trip_id,),
                                    )
                                    trip_payload = cursor_meta.fetchone()
                                    cursor_meta.close()
                                except Exception:
                                    trip_payload = None
                                if self.socketio:
                                    self.socketio.emit(
                                        "trip_completed",
                                        {"trip_id": trip_id, "trip": trip_payload},
                                        namespace="/",
                                    )

                                # Schedule automatic return trip creation (30 seconds buffer)
                                self._schedule_return_trip(trip_id, mysql)

                            except Exception as e:
                                print(
                                    f"CRITICAL: Failed to update trip #{trip_id} to completed in DB: {e}"
                                )
                                print(
                                    f"Trip will retry completion on next update cycle (15s)"
                                )
                                # Do NOT change status, do NOT remove from active_trips, do NOT emit event
                                # Trip will attempt completion again in 15 seconds
                                import traceback

                                traceback.print_exc()
                        else:
                            # Update current stop info
                            current_stop = trip["route_stops"][
                                trip["current_stop_index"]
                            ]
                            trip["current_stop_id"] = current_stop["stop_id"]
                            trip["current_stop_name"] = current_stop["stop_name"]

                            # Emit position update
                            if self.socketio:
                                self.socketio.emit(
                                    "trip_position_update",
                                    {
                                        "trip_id": trip_id,
                                        "current_stop_index": trip[
                                            "current_stop_index"
                                        ],
                                        "current_stop_id": trip["current_stop_id"],
                                        "current_stop_name": trip["current_stop_name"],
                                        "total_stops": trip["total_stops"],
                                    },
                                    namespace="/",
                                )

                    # Remove completed trips
                    for trip_id in trips_to_remove:
                        del self.active_trips[trip_id]

                # Stop thread if no active trips
                if not self.active_trips:
                    self.running = False
                    break

    def _auto_start_scheduled_trips(self):
        """Background thread to start trips automatically at their scheduled departure time"""
        from app import app, mysql
        import MySQLdb.cursors

        while self.scheduler_running:
            time.sleep(10)  # Check every 10 seconds

            with app.app_context():
                # Keep in-memory state in sync with DB; this will recover any trips marked as 'running' in DB
                try:
                    self.sync_active_trips(mysql)
                except Exception as e:
                    print(f"Scheduler sync_active_trips failed: {e}")
                    import traceback

                    traceback.print_exc()
                try:
                    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
                    # Set timezone for this connection
                    cursor.execute("SET time_zone = '+05:00'")

                    # Get current local time from Python (since departure_time is stored in local time)
                    current_local_time = datetime.now()

                    # Debug: Print current time being used for comparison
                    print(
                        f"Scheduler check at {current_local_time.strftime('%Y-%m-%d %H:%M:%S')}"
                    )

                    # Use DB server NOW() within query to avoid Python/DB timezone mismatches
                    cursor.execute(
                        """
                        SELECT trip_id, route_id, direction, departure_time
                        FROM trips
                        WHERE status = 'scheduled'
                          AND departure_time <= NOW()
                        ORDER BY departure_time ASC
                        LIMIT 10
                        """,
                    )

                    due_trips = cursor.fetchall()
                    # Optionally print DB NOW to help troubleshoot scheduler timing
                    try:
                        cursor.execute("SELECT NOW() as db_now")
                        db_now_val = cursor.fetchone()[0]
                        print(f"   DB NOW(): {db_now_val}")
                    except Exception:
                        pass

                    if due_trips:
                        print(f"Found {len(due_trips)} trip(s) ready to start:")
                        for t in due_trips:
                            print(
                                f"   - Trip {t['trip_id']}: departure_time={t['departure_time']}"
                            )
                    else:
                        # Debug: Show next upcoming trip
                        cursor.execute(
                            """
                            SELECT trip_id, departure_time
                            FROM trips
                            WHERE status = 'scheduled'
                            ORDER BY departure_time ASC
                            LIMIT 1
                            """
                        )
                        next_trip = cursor.fetchone()
                        if next_trip:
                            print(
                                f"   Next trip: #{next_trip['trip_id']} at {next_trip['departure_time']}"
                            )

                except Exception as e:
                    print(f"Scheduler error querying trips: {e}")
                    continue

                for trip in due_trips or []:
                    trip_id = trip["trip_id"]
                    route_id = trip["route_id"]
                    direction = trip.get("direction") or "forward"

                    # Skip if already running
                    with self.trips_lock:
                        if trip_id in self.active_trips:
                            print(f"Trip {trip_id} already running, skipping")
                            continue

                    try:
                        cursor.execute(
                            """
                            SELECT rs.stop_id, s.stop_name, rs.stop_order
                            FROM routes_stops rs
                            JOIN stops s ON rs.stop_id = s.stop_id
                            WHERE rs.route_id = %s
                            ORDER BY rs.stop_order
                            """,
                            (route_id,),
                        )
                        route_stops = cursor.fetchall()
                    except Exception as e:
                        print(f"Error fetching route stops for trip {trip_id}: {e}")
                        continue

                    if not route_stops:
                        print(
                            f"No route stops found for trip {trip_id}, route {route_id}"
                        )
                        continue

                    ordered_stops = (
                        route_stops
                        if direction == "forward"
                        else list(reversed(route_stops))
                    )

                    try:
                        success = self.start_trip(
                            trip_id, ordered_stops, mysql, direction
                        )
                    except Exception as ex:
                        success = False
                        print(
                            f"Exception while calling start_trip for trip {trip_id}: {ex}"
                        )
                    if success:
                        print(
                            f"Auto-started trip {trip_id} (route {route_id}, {direction})"
                        )
                    else:
                        print(
                            f"Failed to auto-start trip {trip_id} (may already be running)"
                        )

                cursor.close()

    def _schedule_return_trip(self, completed_trip_id: int, mysql):
        """
        Schedule automatic return trip creation after buffer time
        """
        # Check if auto-return is enabled
        if not self.auto_return_enabled:
            return

        def create_return_trip():
            """Create the scheduled return trip immediately (without sleeping).

            The scheduler thread will still auto-start at its configured time. This function
            inserts a scheduled trip with departure_time = arrival_time + buffer, sets
            origin_trip_id when supported, and emits a socket event so UI updates.
            """
            from app import app

            # Use the admin helper to fetch a fresh MySQL extension so this thread
            # doesn't reuse a connection from the calling context (threads must use
            # their own connections to avoid 'MySQL server has gone away')
            from admin import get_mysql

            print(f"Scheduling return trip for original trip {completed_trip_id}")
            with app.app_context():
                cursor = None
                origin_supported = True
                # Acquire a fresh connection for this thread
                try:
                    thread_mysql = get_mysql()
                except Exception:
                    thread_mysql = mysql
                try:
                    cursor = thread_mysql.connection.cursor()
                    try:
                        cursor.execute("SET time_zone = '+05:00'")
                    except Exception:
                        pass

                    # Try to read origin_trip_id if column exists
                    try:
                        cursor.execute(
                            "SELECT bus_id, route_id, direction, arrival_time, status, origin_trip_id FROM trips WHERE trip_id = %s",
                            (completed_trip_id,),
                        )
                        completed_trip = cursor.fetchone()
                    except Exception:
                        # Fallback for older schemas
                        origin_supported = False
                        cursor.execute(
                            "SELECT bus_id, route_id, direction, arrival_time, status FROM trips WHERE trip_id = %s",
                            (completed_trip_id,),
                        )
                        temp = cursor.fetchone()
                        if temp:
                            completed_trip = (
                                temp[0],
                                temp[1],
                                temp[2],
                                temp[3],
                                temp[4],
                                None,
                            )
                        else:
                            completed_trip = None

                    if not completed_trip:
                        if cursor:
                            try:
                                cursor.close()
                            except Exception:
                                pass
                        return

                    (
                        bus_id,
                        route_id,
                        direction,
                        arrival_time,
                        trip_status,
                        origin_trip_id,
                    ) = completed_trip

                    # Only schedule a return for trips that completed and are not already returns
                    if trip_status != "completed" or origin_trip_id is not None:
                        if cursor:
                            try:
                                cursor.close()
                            except Exception:
                                pass
                        return

                    # Compute desired departure time
                    if arrival_time:
                        departure_time = arrival_time + timedelta(
                            seconds=self.return_buffer_seconds
                        )
                    else:
                        departure_time = datetime.now() + timedelta(
                            seconds=self.return_buffer_seconds
                        )

                    return_direction = (
                        "backward" if direction == "forward" else "forward"
                    )

                    # Check for an existing return trip (scheduled or running)
                    cursor.execute(
                        "SELECT trip_id, departure_time, status FROM trips WHERE bus_id = %s AND route_id = %s AND direction = %s AND status IN ('scheduled', 'running') ORDER BY departure_time ASC LIMIT 1",
                        (bus_id, route_id, return_direction),
                    )
                    existing_trip = cursor.fetchone()

                    if existing_trip:
                        existing_id, existing_departure, existing_status = existing_trip
                        if existing_departure and existing_departure < departure_time:
                            try:
                                cursor.execute(
                                    "UPDATE trips SET departure_time = %s WHERE trip_id = %s",
                                    (departure_time, existing_id),
                                )
                                thread_mysql.connection.commit()
                                new_trip_id = existing_id
                            except Exception:
                                new_trip_id = existing_id
                            # When we adjust an existing scheduled trip's departure time,
                            # ensure origin_trip_id is set when supported and missing.
                            if origin_supported:
                                try:
                                    cursor.execute(
                                        "SELECT origin_trip_id FROM trips WHERE trip_id = %s",
                                        (existing_id,),
                                    )
                                    origin_val = cursor.fetchone()
                                    if origin_val and origin_val[0] is None:
                                        try:
                                            cursor.execute(
                                                "UPDATE trips SET origin_trip_id = %s WHERE trip_id = %s",
                                                (completed_trip_id, existing_id),
                                            )
                                            thread_mysql.connection.commit()
                                            print(
                                                f"Set origin_trip_id for existing return trip {existing_id} to {completed_trip_id}"
                                            )
                                        except Exception as e:
                                            print(
                                                f"Failed to set origin_trip_id on existing trip {existing_id}: {e}"
                                            )
                                except Exception:
                                    pass
                        else:
                            # Existing trip is OK; if origin_trip_id supported and not set, attach origin
                            if origin_supported:
                                try:
                                    cursor.execute(
                                        "SELECT origin_trip_id FROM trips WHERE trip_id = %s",
                                        (existing_id,),
                                    )
                                    origin_val = cursor.fetchone()
                                    if origin_val and origin_val[0] is None:
                                        try:
                                            cursor.execute(
                                                "UPDATE trips SET origin_trip_id = %s WHERE trip_id = %s",
                                                (completed_trip_id, existing_id),
                                            )
                                            thread_mysql.connection.commit()
                                            new_trip_id = existing_id
                                            print(
                                                f"Set origin_trip_id for existing return trip {existing_id} to {completed_trip_id}"
                                            )
                                        except Exception as e:
                                            print(
                                                f"Failed to set origin_trip_id on existing trip {existing_id}: {e}"
                                            )
                                except Exception:
                                    pass
                            if cursor:
                                try:
                                    cursor.close()
                                except Exception:
                                    pass
                            return
                    else:
                        # Insert a new scheduled return trip; include origin_trip_id when supported
                        try:
                            if origin_supported:
                                cursor.execute(
                                    "INSERT INTO trips (bus_id, route_id, direction, departure_time, status, origin_trip_id) VALUES (%s, %s, %s, %s, 'scheduled', %s)",
                                    (
                                        bus_id,
                                        route_id,
                                        return_direction,
                                        departure_time,
                                        completed_trip_id,
                                    ),
                                )
                            else:
                                cursor.execute(
                                    "INSERT INTO trips (bus_id, route_id, direction, departure_time, status) VALUES (%s, %s, %s, %s, 'scheduled')",
                                    (
                                        bus_id,
                                        route_id,
                                        return_direction,
                                        departure_time,
                                    ),
                                )
                            thread_mysql.connection.commit()
                            new_trip_id = cursor.lastrowid
                        except Exception as e:
                            print(
                                f"_schedule_return_trip: Failed to create return trip: {e}"
                            )
                            if cursor:
                                try:
                                    cursor.close()
                                except Exception:
                                    pass
                            return

                    # Emit event for UI and include enriched trip details from trip_details_view
                    trip_payload = None
                    try:
                        # Use trip_details_view to provide enriched fields (route_name, number_plate, available_seats etc.)
                        cursor2 = thread_mysql.connection.cursor(
                            MySQLdb.cursors.DictCursor
                        )
                        cursor2.execute(
                            "SELECT v.trip_id, v.bus_id, v.number_plate, v.route_id, v.route_name, v.direction, v.departure_time, v.arrival_time, v.trip_status as status, v.confirmed_bookings, v.available_seats FROM trip_details_view v WHERE v.trip_id = %s",
                            (new_trip_id,),
                        )
                        trip_payload = cursor2.fetchone()
                        cursor2.close()
                    except Exception:
                        # If the view isn't available, fall back to a minimal payload
                        trip_payload = {
                            "trip_id": new_trip_id,
                            "bus_id": bus_id,
                            "route_id": route_id,
                            "direction": return_direction,
                            "departure_time": departure_time.isoformat(),
                            "status": "scheduled",
                        }

                    if self.socketio:
                        self.socketio.emit(
                            "return_trip_created",
                            {
                                "original_trip_id": completed_trip_id,
                                "new_trip_id": new_trip_id,
                                "bus_id": bus_id,
                                "route_id": route_id,
                                "direction": return_direction,
                                "departure_time": departure_time.isoformat(),
                                "trip": trip_payload,
                            },
                            namespace="/",
                        )

                except Exception as e:
                    print(f"_schedule_return_trip: Unexpected error: {e}")
                    import traceback

                    traceback.print_exc()
                finally:
                    if cursor:
                        try:
                            cursor.close()
                        except Exception:
                            pass

            # After buffer, if auto_return_enabled is set, try to auto-start the newly created trip.
            if self.auto_return_enabled:
                try:
                    with app.app_context():
                        # Re-check the trip status to ensure no external change occurred
                        try:
                            thread_mysql = get_mysql()
                        except Exception:
                            thread_mysql = mysql
                        cursor2 = thread_mysql.connection.cursor(
                            MySQLdb.cursors.DictCursor
                        )
                        try:
                            cursor2.execute("SET time_zone = '+05:00'")
                        except Exception:
                            pass
                        cursor2.execute(
                            "SELECT trip_id, status, route_id, direction, departure_time FROM trips WHERE trip_id = %s",
                            (new_trip_id,),
                        )
                        created = cursor2.fetchone()
                        cursor2.close()
                        if not created:
                            print(
                                f"Return trip #{new_trip_id} disappeared from DB; skipping auto-start"
                            )
                        else:
                            if created.get("status") != "scheduled":
                                print(
                                    f"Return trip #{new_trip_id} is not scheduled (status={created.get('status')}), skipping auto-start"
                                )
                            else:
                                # If there's a departure_time, wait until that time before attempting to auto-start.
                                departure_time_db = created.get("departure_time")
                                if departure_time_db and isinstance(
                                    departure_time_db, datetime
                                ):
                                    now_time = datetime.now()
                                    remaining = (
                                        departure_time_db - now_time
                                    ).total_seconds()
                                    if remaining > 0:
                                        print(
                                            f"Waiting {remaining:.1f}s until scheduled departure for trip #{new_trip_id}"
                                        )
                                        time.sleep(remaining)
                                # Fetch route stops for this return trip and start it in-memory directly
                                cursor3 = thread_mysql.connection.cursor(
                                    MySQLdb.cursors.DictCursor
                                )
                                try:
                                    cursor3.execute("SET time_zone = '+05:00'")
                                except Exception:
                                    pass
                                cursor3.execute(
                                    "SELECT rs.stop_id, s.stop_name, rs.stop_order FROM routes_stops rs JOIN stops s ON rs.stop_id = s.stop_id WHERE rs.route_id = %s ORDER BY rs.stop_order",
                                    (route_id,),
                                )
                                route_stops = cursor3.fetchall()
                                cursor3.close()

                                if not route_stops:
                                    print(
                                        f"Cannot auto-start return trip {new_trip_id}: no route stops found for route {route_id}"
                                    )
                                else:
                                    ordered_stops = (
                                        route_stops
                                        if return_direction == "forward"
                                        else list(reversed(route_stops))
                                    )
                                    # Attempt to start the trip and update DB inside start_trip
                                    try:
                                        started = self.start_trip(
                                            new_trip_id,
                                            ordered_stops,
                                            thread_mysql,
                                            return_direction,
                                        )
                                        if started:
                                            print(
                                                f"Return trip {new_trip_id} auto-started successfully (direction {return_direction})"
                                            )
                                        else:
                                            print(
                                                f"Return trip {new_trip_id} was not started (maybe it's already running)"
                                            )
                                    except Exception as ex:
                                        print(
                                            f"Failed to auto-start return trip {new_trip_id}: {ex}"
                                        )
                except Exception as e:
                    print(
                        f"Error while attempting to auto-start return trip {new_trip_id}: {e}"
                    )

        # Start thread to create return trip after buffer
        return_trip_thread = Thread(target=create_return_trip, daemon=True)
        return_trip_thread.start()

    def recover_active_trips(self, mysql, specific_trip_ids: List[int] = None):
        """
        Recover running trips from database using provided MySQL connection
        specific_trip_ids: Optional list of trip IDs to recover. If None, checks all running trips.
        """
        try:
            cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute("SET time_zone = '+05:00'")

            # Find trips marked as running in database
            if specific_trip_ids:
                if not specific_trip_ids:
                    return
                format_strings = ",".join(["%s"] * len(specific_trip_ids))
                cursor.execute(
                    f"""
                    SELECT t.trip_id, t.route_id, t.direction, r.route_name
                    FROM trips t
                    JOIN routes r ON t.route_id = r.route_id
                    WHERE t.trip_id IN ({format_strings}) AND t.status = 'running'
                    """,
                    tuple(specific_trip_ids),
                )
            else:
                cursor.execute(
                    """
                    SELECT t.trip_id, t.route_id, t.direction, r.route_name
                    FROM trips t
                    JOIN routes r ON t.route_id = r.route_id
                    WHERE t.status = 'running'
                    ORDER BY t.departure_time ASC
                    """
                )

            running_trips = cursor.fetchall()

            if running_trips:
                print(
                    f"Recovering {len(running_trips)} running trip(s) from database..."
                )

            for trip in running_trips:
                try:
                    trip_id = trip["trip_id"]
                    route_id = trip["route_id"]
                    route_name = trip.get("route_name")
                    direction = trip.get("direction") or "forward"
                    print(
                        f"recover_active_trips: Reconstructing trip {trip_id} (route {route_id}, direction={direction})"
                    )

                    # Get route stops
                    cursor.execute(
                        """
                        SELECT rs.stop_id, s.stop_name, rs.stop_order
                        FROM routes_stops rs
                        JOIN stops s ON rs.stop_id = s.stop_id
                        WHERE rs.route_id = %s
                        ORDER BY rs.stop_order
                        """,
                        (route_id,),
                    )
                    route_stops = cursor.fetchall()

                    if not route_stops:
                        print(f"Cannot recover trip {trip_id}: no route stops found")
                        continue

                    ordered_stops = (
                        route_stops
                        if direction == "forward"
                        else list(reversed(route_stops))
                    )

                    # Check if already in active_trips
                    with self.trips_lock:
                        if trip_id in self.active_trips:
                            # Trip already active, skip
                            continue

                        # Restore trip to active_trips (assume it's at first stop since we don't know actual position)
                        actual_start_time = datetime.now()
                        self.active_trips[trip_id] = {
                            "trip_id": trip_id,
                            "route_id": route_id,
                            "route_name": route_name,
                            "direction": direction,
                            "route_stops": ordered_stops,
                            "current_stop_index": 0,
                            "current_stop_id": ordered_stops[0]["stop_id"],
                            "current_stop_name": ordered_stops[0]["stop_name"],
                            "started_at": actual_start_time,
                            "last_update": actual_start_time,
                            "status": "running",
                            "total_stops": len(ordered_stops),
                        }

                        print(
                            f"Recovered trip {trip_id} (route {route_id}, {direction}) - starting from first stop"
                        )

                    # Emit to all connected clients
                    if self.socketio:
                        self.socketio.emit(
                            "trip_started",
                            {
                                "trip_id": trip_id,
                                "current_stop_index": 0,
                                "current_stop_name": ordered_stops[0]["stop_name"],
                                "total_stops": len(ordered_stops),
                            },
                            namespace="/",
                        )

                    # Start background thread if not running
                    if not self.running:
                        self.running = True
                        self.update_thread = Thread(
                            target=self._update_positions, daemon=True
                        )
                        self.update_thread.start()

                except Exception as trip_error:
                    print(
                        f"Failed to recover trip {trip.get('trip_id', 'UNKNOWN')}: {trip_error}"
                    )
                    import traceback

                    traceback.print_exc()
                    # Continue with next trip

            cursor.close()

        except Exception as e:
            print(f"Error recovering running trips: {e}")

    def sync_active_trips(self, mysql, force: bool = False):
        """
        Ensure in-memory tracker is in sync with database.
        - Recovers trips marked as 'running' in DB but missing from tracker
        - Removes trips from tracker that are no longer 'running' in DB (stale trips)
        - Throttles syncs to avoid excessive DB load
        """
        try:
            # Throttle syncs - only sync if enough time has passed (unless forced)
            now = datetime.now()
            if not force and self.last_sync_time:
                elapsed = (now - self.last_sync_time).total_seconds()
                if elapsed < self.sync_interval_seconds:
                    print(
                        f"sync_active_trips: Skipping sync (elapsed {elapsed:.1f}s < interval {self.sync_interval_seconds}s)"
                    )
                    return  # Skip sync, too soon since last one

            # Update last sync time
            self.last_sync_time = now

            # 1. Get running trip IDs from DB
            cursor = mysql.connection.cursor()
            cursor.execute("SELECT trip_id FROM trips WHERE status = 'running'")
            db_running_ids = {row[0] for row in cursor.fetchall()}
            cursor.close()

            # 2. Get active trip IDs from tracker
            with self.trips_lock:
                tracker_ids = set(self.active_trips.keys())

            # 3. Find missing trips (in DB but not in tracker)
            missing_ids = db_running_ids - tracker_ids

            # 4. Find stale trips (in tracker but not running in DB)
            stale_ids = tracker_ids - db_running_ids

            # 5. Recover missing trips
            if missing_ids:
                print(
                    f"Found {len(missing_ids)} running trips missing from tracker. Syncing..."
                )
                self.recover_active_trips(mysql, list(missing_ids))

            # 6. Clean up stale trips
            if stale_ids:
                print(
                    f"Removing {len(stale_ids)} stale trips from tracker: {stale_ids}"
                )
                with self.trips_lock:
                    for trip_id in stale_ids:
                        if trip_id in self.active_trips:
                            del self.active_trips[trip_id]
                            # Emit removal event
                            if self.socketio:
                                self.socketio.emit(
                                    "trip_removed", {"trip_id": trip_id}, namespace="/"
                                )

        except Exception as e:
            print(f"Sync error: {e}")
            import traceback

            traceback.print_exc()

    def _recover_running_trips(self):
        """Recover running trips from database on startup (in case of server restart)"""
        # Prevent duplicate recovery
        if self.recovery_completed:
            print("Recovery already completed, skipping duplicate recovery attempt")
            return

        from app import app, mysql

        def recover():
            time.sleep(2)  # Wait for app to fully initialize
            with app.app_context():
                self.recover_active_trips(mysql)
                self.recovery_completed = True  # Mark recovery as completed
                print("Trip recovery completed")

        # Run recovery in background thread
        Thread(target=recover, daemon=True).start()


# Global instance
bus_tracker = BusTracker()
