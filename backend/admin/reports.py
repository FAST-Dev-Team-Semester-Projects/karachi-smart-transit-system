from typing import Optional, Any, Dict
from datetime import datetime, timezone

from flask import request, jsonify, current_app

from . import admin_bp, admin_required, get_mysql
from .repos import reports as reports_repo


def _parse_date_param(name: str) -> Optional[datetime]:
    v = request.args.get(name)
    if not v:
        return None
    try:
        dt = datetime.fromisoformat(v)
    except ValueError:
        raise ValueError(f"Invalid date format for '{name}', expected ISO format")

    # normalize timezone-aware datetimes to UTC and return naive UTC datetime
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


@admin_bp.route("/reports/bookings/daily", methods=["GET"])
@admin_required
def bookings_daily():
    """
    Enhanced daily booking analytics using MySQL stored procedure.
    Supports date ranges by calling get_daily_booking_analytics() for each day.
    Returns array format for frontend compatibility.
    """
    try:
        from datetime import date, timedelta
        
        # Parse date range parameters
        start_date = None
        end_date = None
        
        start_str = request.args.get('start_date')
        end_str = request.args.get('end_date')
        
        # Parse start_date (can be ISO datetime or YYYY-MM-DD)
        if start_str:
            try:
                # Try parsing as ISO datetime first
                start_dt = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
                start_date = start_dt.date()
            except ValueError:
                try:
                    # Fall back to YYYY-MM-DD format
                    start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
                except ValueError:
                    return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD or ISO format"}), 400
        
        # Parse end_date (can be ISO datetime or YYYY-MM-DD)
        if end_str:
            try:
                # Try parsing as ISO datetime first
                end_dt = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
                end_date = end_dt.date()
            except ValueError:
                try:
                    # Fall back to YYYY-MM-DD format
                    end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
                except ValueError:
                    return jsonify({"error": "Invalid end_date format. Use YYYY-MM-DD or ISO format"}), 400
        
        # Default to today if no date range specified
        if not start_date and not end_date:
            start_date = date.today()
            end_date = date.today()
        elif start_date and not end_date:
            end_date = start_date
        elif not start_date and end_date:
            start_date = end_date
        
        # Ensure start_date <= end_date
        if start_date > end_date:
            start_date, end_date = end_date, start_date
        
        # Limit to 90 days to prevent excessive queries
        date_diff = (end_date - start_date).days
        if date_diff > 90:
            return jsonify({"error": "Date range too large. Maximum 90 days allowed."}), 400
        
        mysql = get_mysql()
        results = []
        
        # Iterate over each day in the range
        current_date = start_date
        while current_date <= end_date:
            cursor = mysql.connection.cursor()
            try:
                # Call stored procedure for this specific day
                cursor.callproc('get_daily_booking_analytics', [current_date])
                result = cursor.fetchone()
                
                if result:
                    # Convert to dictionary
                    columns = [desc[0] for desc in cursor.description]
                    day_data = dict(zip(columns, result))
                    # Format the date as string for frontend compatibility
                    day_data['day'] = str(current_date)
                    # Extract bookings count for backward compatibility
                    day_data['bookings'] = day_data.get('total_bookings', 0)
                    results.append(day_data)
                else:
                    # No bookings for this day - include it with zero count
                    results.append({
                        "day": str(current_date),
                        "bookings": 0,
                        "total_bookings": 0,
                        "confirmed_bookings": 0,
                        "cancelled_bookings": 0
                    })
            finally:
                cursor.close()
            
            # Move to next day
            current_date += timedelta(days=1)
        
        # Return array of daily analytics
        return jsonify(results), 200
            
    except Exception:
        current_app.logger.exception("Failed to generate bookings daily report")
        return jsonify({"error": "Internal server error"}), 500



@admin_bp.route("/reports/bookings/status", methods=["GET"])
@admin_required
def bookings_status():
    try:
        start = _parse_date_param("start_date")
        end = _parse_date_param("end_date")
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    try:
        data = reports_repo.bookings_count_by_status(
            mysql=get_mysql(), start_date=start, end_date=end
        )
        return jsonify(data), 200
    except Exception:
        current_app.logger.exception("Failed to generate bookings status report")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/reports/revenue/daily", methods=["GET"])
@admin_required
def revenue_daily():
    try:
        start = _parse_date_param("start_date")
        end = _parse_date_param("end_date")
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    try:
        data = reports_repo.revenue_by_day(
            mysql=get_mysql(), start_date=start, end_date=end
        )
        return jsonify(data), 200
    except Exception:
        current_app.logger.exception("Failed to generate revenue daily report")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/reports/revenue/total", methods=["GET"])
@admin_required
def revenue_total():
    try:
        start = _parse_date_param("start_date")
        end = _parse_date_param("end_date")
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    try:
        total_revenue = reports_repo.total_revenue(
            mysql=get_mysql(), start_date=start, end_date=end
        )
        return jsonify(total_revenue), 200
    except Exception:
        current_app.logger.exception("Failed to generate total revenue report")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/reports/trips/summary-by-route", methods=["GET"])
@admin_required
def trips_summary_by_route():
    try:
        start = _parse_date_param("start_date")
        end = _parse_date_param("end_date")
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    try:
        data = reports_repo.trips_summary_by_route(
            mysql=get_mysql(), start_date=start, end_date=end
        )
        return jsonify(data), 200
    except Exception:
        current_app.logger.exception("Failed to generate trips summary by route report")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/reports/top_routes", methods=["GET"])
@admin_required
def top_routes():
    # Limit param (default 10), max cap 100
    try:
        limit_raw = request.args.get("limit", "10")
        limit = int(limit_raw)
        if limit < 1:
            return jsonify({"error": "Limit must be >= 1"}), 400
        if limit > 100:
            limit = 100
    except ValueError:
        return jsonify({"error": "Invalid limit parameter"}), 400

    try:
        start = _parse_date_param("start_date")
        end = _parse_date_param("end_date")
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    try:
        data = reports_repo.top_routes_by_bookings(
            mysql=get_mysql(), start_date=start, end_date=end, limit=limit
        )
        return jsonify(data), 200
    except Exception:
        current_app.logger.exception("Failed to generate top routes report")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/reports/summary", methods=["GET"])
@admin_required
def bookings_and_payments_summary():
    try:
        start = _parse_date_param("start_date")
        end = _parse_date_param("end_date")
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    try:
        data = reports_repo.bookings_and_payments_summary(
            mysql=get_mysql(), start_date=start, end_date=end
        )
        return jsonify(data), 200
    except Exception:
        current_app.logger.exception(
            "Failed to generate bookings and payments summary report"
        )
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/reports/dashboard", methods=["GET"])
@admin_required
def dashboard_overview():
    try:
        start = _parse_date_param("start_date")
        end = _parse_date_param("end_date")
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    try:
        data = reports_repo.dashboard_overview(
            mysql=get_mysql(), start_date=start, end_date=end
        )
        return jsonify(data), 200
    except Exception:
        current_app.logger.exception("Failed to generate dashboard overview")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/reports/users", methods=["GET"])
@admin_required
def user_analytics():
    try:
        start = _parse_date_param("start_date")
        end = _parse_date_param("end_date")
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    try:
        data = reports_repo.user_analytics(
            mysql=get_mysql(), start_date=start, end_date=end
        )
        return jsonify(data), 200
    except Exception:
        current_app.logger.exception("Failed to generate user analytics")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/reports/bus-utilization", methods=["GET"])
@admin_required
def bus_utilization():
    try:
        start = _parse_date_param("start_date")
        end = _parse_date_param("end_date")
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    try:
        data = reports_repo.bus_utilization(
            mysql=get_mysql(), start_date=start, end_date=end
        )
        return jsonify(data), 200
    except Exception:
        current_app.logger.exception("Failed to generate bus utilization report")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/reports/payments", methods=["GET"])
@admin_required
def payment_analytics():
    try:
        start = _parse_date_param("start_date")
        end = _parse_date_param("end_date")
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    try:
        data = reports_repo.payment_analytics(
            mysql=get_mysql(), start_date=start, end_date=end
        )
        return jsonify(data), 200
    except Exception:
        current_app.logger.exception("Failed to generate payment analytics")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/reports/peak-hours", methods=["GET"])
@admin_required
def peak_hours():
    try:
        start = _parse_date_param("start_date")
        end = _parse_date_param("end_date")
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    try:
        data = reports_repo.peak_hours_analysis(
            mysql=get_mysql(), start_date=start, end_date=end
        )
        return jsonify(data), 200
    except Exception:
        current_app.logger.exception("Failed to generate peak hours analysis")
        return jsonify({"error": "Internal server error"}), 500


@admin_bp.route("/reports/route-performance", methods=["GET"])
@admin_required
def route_performance():
    try:
        start = _parse_date_param("start_date")
        end = _parse_date_param("end_date")
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    try:
        data = reports_repo.route_performance(
            mysql=get_mysql(), start_date=start, end_date=end
        )
        return jsonify(data), 200
    except Exception:
        current_app.logger.exception("Failed to generate route performance report")
        return jsonify({"error": "Internal server error"}), 500


# ============================================================================
# NEW: MySQL Stored Procedure Endpoints
# ============================================================================

@admin_bp.route("/reports/trip-revenue/<int:trip_id>", methods=["GET"])
@admin_required
def trip_revenue_breakdown(trip_id):
    """
    Get comprehensive revenue breakdown for a specific trip.
    Calls MySQL stored procedure: get_trip_revenue_breakdown(trip_id)
    """
    try:
        mysql = get_mysql()
        cursor = mysql.connection.cursor()
        
        # Call stored procedure
        cursor.callproc('get_trip_revenue_breakdown', [trip_id])
        
        # Fetch results
        result = cursor.fetchone()
        
        if result:
            # Convert to dictionary
            columns = [desc[0] for desc in cursor.description]
            data = dict(zip(columns, result))
            cursor.close()
            return jsonify(data), 200
        else:
            cursor.close()
            return jsonify({"error": "Trip not found"}), 404
            
    except Exception as e:
        current_app.logger.exception("Failed to get trip revenue breakdown")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@admin_bp.route("/reports/daily-analytics", methods=["GET"])
@admin_required
def daily_analytics():
    """
    Get comprehensive daily booking analytics for a specific date.
    Calls MySQL stored procedure: get_daily_booking_analytics(report_date)
    Query param: date (YYYY-MM-DD format, defaults to today)
    """
    try:
        # Parse date parameter
        date_str = request.args.get('date')
        if date_str:
            try:
                report_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        else:
            # Default to today
            report_date = datetime.now().date()
        
        mysql = get_mysql()
        cursor = mysql.connection.cursor()
        
        # Call stored procedure
        cursor.callproc('get_daily_booking_analytics', [report_date])
        
        # Fetch results
        result = cursor.fetchone()
        
        if result:
            # Convert to dictionary
            columns = [desc[0] for desc in cursor.description]
            data = dict(zip(columns, result))
            cursor.close()
            return jsonify(data), 200
        else:
            cursor.close()
            # No data for that date
            return jsonify({
                "booking_date": str(report_date),
                "total_bookings": 0,
                "message": "No bookings found for this date"
            }), 200
            
    except Exception as e:
        current_app.logger.exception("Failed to get daily analytics")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@admin_bp.route("/reports/user-profile/<int:user_id>", methods=["GET"])
@admin_required
def user_profile_analytics(user_id):
    """
    Get comprehensive user profile with booking statistics.
    Calls MySQL stored procedure: get_user_complete_profile(user_id)
    """
    try:
        mysql = get_mysql()
        cursor = mysql.connection.cursor()
        
        # Call stored procedure
        cursor.callproc('get_user_complete_profile', [user_id])
        
        # Fetch results
        result = cursor.fetchone()
        
        if result:
            # Convert to dictionary
            columns = [desc[0] for desc in cursor.description]
            data = dict(zip(columns, result))
            cursor.close()
            return jsonify(data), 200
        else:
            cursor.close()
            return jsonify({"error": "User not found"}), 404
            
    except Exception as e:
        current_app.logger.exception("Failed to get user profile analytics")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

