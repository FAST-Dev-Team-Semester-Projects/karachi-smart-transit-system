"""
Set MySQL database timezone to Asia/Karachi (Pakistan Time, UTC+5)
"""

from app import app, mysql

with app.app_context():
    cursor = mysql.connection.cursor()

    # Set session timezone to Asia/Karachi
    cursor.execute("SET time_zone = '+05:00'")

    # Verify the change
    cursor.execute("SELECT NOW(), @@session.time_zone")
    result = cursor.fetchone()

    print(f"Database timezone set successfully!")
    print(f"Current DB Time: {result[0]}")
    print(f"Timezone: {result[1]}")

    cursor.close()
