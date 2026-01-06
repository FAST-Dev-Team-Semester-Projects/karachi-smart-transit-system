# Database (MySQL)

This folder contains the canonical MySQL schema, seed scripts, triggers, functions, procedures, migrations, and ERD for the KSTS backend.

---

## Database Concepts Demonstrated

This project showcases comprehensive database design and implementation following relational database principles:

### Data Modeling & Normalization
- **Entity-Relationship Design**: 12 interconnected tables with proper relationships
- **Third Normal Form (3NF)**: Eliminated transitive dependencies and redundancy
- **Referential Integrity**: Foreign key constraints ensuring data consistency
- **Check Constraints**: Business rule validation at database level

### Transaction Management
- **ACID Properties**: Atomicity, Consistency, Isolation, Durability in payment processing
- **Rollback Capabilities**: Automatic transaction reversal on payment failures
- **Error Handling**: Comprehensive exception management in stored procedures
- **Data Consistency**: Maintaining integrity across multi-table operations

### Triggers & Automation
- **Business Rule Enforcement**: Automatic driver assignment conflict prevention
- **Data Validation**: Real-time input sanitization and format checking
- **Audit Trails**: Automated logging of critical operations
- **Data Cleaning**: Automatic whitespace trimming and format standardization

### Stored Procedures & Functions
- **Complex Business Logic**: Trip generation algorithms and booking workflows
- **Payment Processing**: Secure credit card validation using Luhn algorithm
- **Reporting Functions**: Table-valued procedures for analytics and insights
- **Parameterized Queries**: Dynamic SQL with proper input validation

### Performance Optimization
- **Indexing Strategy**: Composite and single-column indexes for query optimization
- **View Creation**: Pre-computed result sets for complex reporting queries
- **Query Optimization**: Efficient JOIN operations and subquery minimization
- **Scalable Design**: Architecture supporting Karachi's transit network growth

### Data Security & Integrity
- **Input Validation**: Multiple layers of data sanitization
- **Constraint Enforcement**: Database-level business rule implementation
- **Transaction Security**: Protected multi-step operations
- **Audit Capabilities**: Comprehensive logging and tracking mechanisms

---

## Key Structure & Files

- `ksts_schema.sql` — Canonical schema: creates all tables, constraints, and relationships.
- `seed_data/` — Organized seed scripts for services, routes, buses, drivers, and assignments.
- `triggers/triggers.sql` — All database triggers (data cleaning, business rule enforcement, core data protection).
- `functions/functions.sql` — Scalar (single-value) functions for demonstration (not used in production system).
- `procedures/table_valued_procedures.sql` — Table-valued procedures (simulate table-valued functions; used for admin reports, analytics, etc.).
- `procedures/` — Key stored procedures (e.g., trip generation, table-valued procedures).
- `migrations/` — Migration scripts (e.g., payment/booking logic, schema changes).
- `views/` — Complex views
- `indexes/` — Performance indexes for optimization.
- [ERD/](ERD/) — Entity-Relationship Diagram ([ERD.png](ERD/ERD.png)).

---

## How to Set Up the Database

1. **Create the schema:**
	- Run `ksts_schema.sql` in MySQL Workbench, DBeaver, or via command line.
2. **Seed data:**
	- Run scripts in `seed_data/` as needed (see folder for details).
3. **Add triggers and procedures:**
	- Run `triggers/triggers.sql` and scripts in `procedures/`.
4. **Apply migrations:**
	- Run scripts in `migrations/` for payment logic and any schema updates.
5. **Create views and indexes:**
	- Run scripts in `views/` and `indexes/` as needed.
6. **Reference the ERD:**
	- See [ERD/ERD.png](ERD/ERD.png) for a full entity-relationship diagram.

---

## Idempotency & Safety
- Most seed scripts use `ON DUPLICATE KEY UPDATE` and are safe to re-run.
- Some scripts (e.g., full master seeds) use `TRUNCATE` and are for fresh DBs only—read comments before running.
- Never run destructive scripts on production or shared DBs.
- Always test seeds and migrations on a disposable/test DB before production.

---

## Payment Processing & Transactions

- Payment logic is implemented in `migrations/passenger_booking_procedures.sql` and related procedures.
- Features:
  - Credit card validation (Luhn algorithm, no full card storage)
  - Transaction management (START TRANSACTION, COMMIT, ROLLBACK)
  - Rollback demonstration for failed payments
- See code comments and backend documentation for test cards and usage.

---


## Triggers, Functions, and Procedures
- All triggers are in `triggers/triggers.sql` (route name cleaning, phone cleaning, driver assignment conflict prevention, core data protection).
- Scalar functions (for demonstration only, not used in production) are in `functions/functions.sql`.
- Table-valued procedures (simulate table-valued functions; used in admin reports and analytics) are in `procedures/table_valued_procedures.sql`.
- Key procedures (e.g., trip generation, booking logic) are in `procedures/` and `migrations/`.

---

## ERD
- See [ERD/ERD.png](ERD/ERD.png) for the full entity-relationship diagram.
- See [ERD/README.md](ERD/README.md) for detailed usage notes and limitations.
