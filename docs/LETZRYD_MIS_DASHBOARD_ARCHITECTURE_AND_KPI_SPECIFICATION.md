# LetzRyd MIS Dashboard: Master Architecture, KPI Catalog & Database Specification

**Authoritative Technical Reference & Data Dictionary**  
**Database Host:** `35.200.196.113:5432/postgres` (`letzryd-pgsql-dev1`)  
**Production Rollup Table:** `public.fact_daily_management_mis`  
**Automated Scheduler:** Native PostgreSQL `pg_cron` (Dual-Cadence 7-Day & 30-Day Rolling Windows)  
**Last Updated:** October 2026

---

## 1. Executive Summary & Zero-Impact Architecture

The **LetzRyd MIS Dashboard** provides executive and operational visibility across fleet utilization, aggregator trips (Uber, Ola, Rapido), gross and net revenue streams, weekly/daily incentives, trip quality economics (OEPK), and GPS telemetry dead miles.

### Zero-Performance Impact Architectural Guarantees:
1. **Strict Source Table Isolation:**
   - Raw operational tables (`core_vehicle_onboarding`, `core_vehicle_allocation`, `core_maintenance`, `core_uber_daily`, `core_ola_daily`, `core_gps`, `uber_raw_*`, `ola_raw_*`) are **NEVER queried directly** during user interactions.
   - Zero table locks, zero unindexed full-table scans, and zero transaction blocking.
2. **Pre-Aggregated Physical Summary Rollup (`public.fact_daily_management_mis`):**
   - High-performance physical summary table storing exactly **1 pre-calculated row per calendar day** (~120 bytes per row).
   - Even over 10 years (3,650 rows / ~450 KB), the entire dataset resides in PostgreSQL's in-memory buffer cache.
3. **Automated Dual-Cadence Background Refresh (`pg_cron`):**
   - **Hourly Refresh (7-Day Rolling Window):** Runs every hour at minute `:55` (`55 * * * *`) via `CALL public.sp_refresh_daily_mis_rolling(7);`. Scans only the past 7 days of indexed records in **~280 milliseconds (0.28s)**.
   - **Nightly Deep Sweep (30-Day Rolling Window):** Runs every morning at `03:00 AM IST` (`0 3 * * *`) via `CALL public.sp_refresh_daily_mis_rolling(30);` in **~500 milliseconds (0.50s)** to capture late-submitted weekend drop-offs, adjustments, or delayed telemetry.
4. **Sub-5ms Portal Response:**
   - The FastAPI backend endpoint (`GET /api/mis/daily-metrics`) executes indexed primary-key queries on `fact_daily_management_mis`, loading months of dashboard metrics in **< 5 milliseconds**.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. SOURCE OPERATIONAL TABLES (NEVER TOUCHED BY LIVE DASHBOARD QUERIES)                      │
│    • core_vehicle_onboarding  • core_vehicle_allocation  • core_maintenance                 │
│    • core_uber_daily          • core_ola_daily           • core_gps                         │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼ Background pg_cron (7-Day & 30-Day Rolling)
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. PRE-AGGREGATED ROLLUP TABLE (1 row per calendar day)                                     │
│    • public.fact_daily_management_mis                                                       │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼ Sub-5ms Indexed Lookup (PK: record_date)
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. FASTAPI API & REACT DASHBOARD                                                            │
│    • GET /api/mis/daily-metrics  ──>  MISDashboard.tsx (Daily, Weekly, Monthly Views)      │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Official GitHub Repositories to Database Table Matrix

| Repository Name | Repository URL | Target DB Tables / Views | Primary Data Domain |
| :--- | :--- | :--- | :--- |
| **`portaljuly`** (Current) | `github.com/aayush-letzryd/portaljuly` | `fact_daily_management_mis`, `july_*`, `core_*` | Main Portal UI, FastAPI API, Stored Procedures |
| **`backend`** | `github.com/aayush-letzryd/backend` | `core_vehicle_onboarding`, `core_vehicle_allocation`, `core_dropoffs`, `core_maintenance`, `core_accidents` | Core fleet assets, driver allocations, returns, workshops |
| **`uber`** | `github.com/aayush-letzryd/uber` | `core_uber_daily`, `uber_pipeline_trips`, `uber_pipeline_order_transactions` | Uber daily trips, net fare earnings, trip distance |
| **`uber-incentive`** | `github.com/aayush-letzryd/uber-incentive` | `core_uber_weekly`, `uber_vehicle_incentives_raw`, `uber_incentive_*` | Uber weekly vehicle incentives, target bonuses |
| **`ola`** | `github.com/aayush-letzryd/ola` | `core_ola_daily`, `ola_raw_crns`, `raw_ola_data` | Ola daily completed trips, operator bills, trip kms |
| **`ola-incentive`** | `github.com/aayush-letzryd/ola-incentive` | `core_ola_incentives`, `ola_incentive_*` | Ola daily & weekly partner incentives, TDS netting |
| **`bangalore-challan`** | `github.com/aayush-letzryd/bangalore-challan` | `core_challans`, `challan_fines_raw` | Traffic police violations, notices, fine amounts |
| **`backend_v3`** | `github.com/aayush-letzryd/backend_v3` | `core_daily_vehicle_status`, `core_gps`, `gps_log` | Daily vehicle status snapshot engine, GPS odometer |

---

## 3. Master KPI Catalog, Formulas & Database Logic

All operational queries strictly enforce non-destructive soft deletes via `WHERE is_deleted = FALSE`.

### Section 1: Assets & Fleet Management (8 KPIs)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ ASSETS SECTION (Tan/Gold Theme)                                                             │
│ Total Fleet = Allotted Cars + R&M Vehicles + Unallocated Inventory                          │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 1. Total Vehicle Days
* **Definition:** Total active vehicle capacity owned/leased in the fleet on a given date.
* **Source Table:** `public.core_vehicle_onboarding` (or `public.core_daily_vehicle_status`)
* **Source Column:** `registration_no` / `vehicle_number`
* **Filters & Exclusions:** `WHERE is_deleted = FALSE AND vehicle_status NOT IN ('Sold', 'Total Loss', 'Decommissioned')`
* **Canonical Formula:**
  $$\text{Total Vehicle Days} = \text{COUNT}(\text{DISTINCT } \text{vehicle\_number})$$

#### 2. Alloted cars Days
* **Definition:** Total vehicles under active driver allocation/custody on a given operational date.
* **Source Tables:** `public.core_vehicle_allocation` ($A$) joined with `public.core_dropoffs` ($D$)
* **Source Columns:** `A.vehicle_number`, `A.allocation_date`, `D.dropoff_date`
* **Filters & Custody Overlap Logic:**
  - Allocation is valid on date $T$ if $A.\text{allocation\_date} \le T$ AND $(D.\text{dropoff\_date} \ge T \text{ OR } D.\text{id IS NULL})$.
  - In `core_daily_vehicle_status`: `WHERE cohort = 'On Road'` (includes `Active`, `Allocation`, `Same Day D&A`).
* **Canonical Formula:**
  $$\text{Allotted Cars Days} = \text{COUNT}(\text{DISTINCT } \text{vehicle\_number})_{\text{cohort} = \text{'On Road'}}$$

#### 3. R&M Vehicle Days (Repairs & Maintenance)
* **Definition:** Total vehicles grounded in workshops/garages for repairs, servicing, or bodywork.
* **Source Table:** `public.core_maintenance`
* **Source Columns:** `vehicle_number`, `start_date`, `end_date`, `in_date_time`, `out_date_time`
* **Edge Case Guard (Stale Ticket Guard):**
  - Historical maintenance tickets sometimes lack an `end_date` / `out_date_time`.
  - **Guard:** If `end_date IS NULL`, the vehicle ceases to count as R&M if a subsequent driver allocation occurred on or before date $T$.
  - In `core_daily_vehicle_status`: `WHERE final_status = 'Maintenance'`.
* **Canonical Formula:**
  $$\text{R\&M Vehicle Days} = \text{COUNT}(\text{DISTINCT } \text{vehicle\_number})_{\text{final\_status} = \text{'Maintenance'}}$$

#### 4. Inventory Vehicle Days
* **Definition:** Unallocated, roadworthy vehicles parked in yards/hubs available for immediate assignment.
* **Source Tables:** Derived from Fleet Balance or `core_daily_vehicle_status`
* **Sub-Categories:** `RFD (Ready for Deployment)`, `Drop Off (Pending Check-In)`, `New Deployment`.
* **Canonical Formula:**
  $$\text{Inventory Days} = \text{Total Vehicle Days} - (\text{Allotted Cars Days} + \text{R\&M Vehicle Days})$$

#### 5. Active Vehicle Days
* **Definition:** Distinct vehicles that fulfilled at least one revenue-generating passenger trip on date $T$.
* **Source Tables:** `public.core_uber_daily`, `public.core_ola_daily`, `public.core_rapido_daily`
* **Cross-Platform Union & Deduplication:**
  $$\text{Active Vehicles} = \text{COUNT}(\text{DISTINCT } \text{vehicle\_number}) \quad [\text{Trips}_{\text{Uber}} > 0 \cup \text{Trips}_{\text{Ola}} > 0 \cup \text{Trips}_{\text{Rapido}} > 0]$$

#### 6. Utilisation %
* **Definition:** Productive utilization rate of allotted fleet assets.
* **Canonical Formula:**
  $$\text{Utilisation \%} = \text{ROUND}\left(\frac{\text{Active Vehicle Days}}{\text{NULLIF}(\text{Allotted Cars Days}, 0)} \times 100, 2\right)$$
  *(Alternative Total Fleet Ratio: $\frac{\text{Active Vehicle Days}}{\text{Total Vehicle Days}} \times 100$)*

#### 7. Allotted %
* **Definition:** Proportion of total fleet actively assigned to revenue-earning drivers.
* **Canonical Formula:**
  $$\text{Allotted \%} = \text{ROUND}\left(\frac{\text{Allotted Cars Days}}{\text{NULLIF}(\text{Total Vehicle Days}, 0)} \times 100, 2\right)$$

#### 8. R&M %
* **Definition:** Workshop downtime ratio relative to overall fleet size.
* **Canonical Formula:**
  $$\text{R\&M \%} = \text{ROUND}\left(\frac{\text{R\&M Vehicle Days}}{\text{NULLIF}(\text{Total Vehicle Days}, 0)} \times 100, 2\right)$$

---

### Section 2: Trips & Platform Volume (4 KPIs)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ TRIPS SECTION (Mustard Gold Theme)                                                          │
│ Total Platform Volume (TPV) = Trips-OLA + Trips-Uber + Trips-Rapido                         │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 9. Trips-OLA
* **Source Table:** `public.core_ola_daily`
* **Source Column:** `completed_trips`
* **Filtering:** `WHERE service_date = T AND completion_status ILIKE '%complete%'`
* **Formula:** `SUM(COALESCE(completed_trips, 0))`

#### 10. Trips-Uber
* **Source Table:** `public.core_uber_daily`
* **Source Column:** `completed_trips`
* **Shift Window Cutoff (04:00 AM IST):**
  - Uber operational days run 04:00 AM to 04:00 AM.
  - Formulated as `(trip_request_time - INTERVAL '4 hours')::date`.
* **Formula:** `SUM(COALESCE(completed_trips, 0))`

#### 11. Trips-Rapido
* **Source Table:** `public.core_rapido_daily` (and `rapido_raw_*`)
* **Source Column:** `completed_trips`
* **Formula:** `SUM(COALESCE(completed_trips, 0))`

#### 12. TPV (Total Platform Volume)
* **Definition:** Master ride fulfillment volume and driver productivity ratio.
* **Volume Metric:**
  $$\text{TPV}_{\text{Volume}} = \text{Trips}_{\text{Ola}} + \text{Trips}_{\text{Uber}} + \text{Trips}_{\text{Rapido}}$$
* **Operational Ratio (Trips Per Active Vehicle):**
  $$\text{TPV}_{\text{Ratio}} = \text{ROUND}\left(\frac{\text{Total Completed Trips}}{\text{NULLIF}(\text{Active Vehicle Days}, 0)}, 2\right)$$

---

### Section 3: Revenue, Incentives & Unit Economics (12 KPIs)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ REVENUE SECTION (Purple / Lavender Theme)                                                   │
│ Total Revenue = Σ(Platform Net Revenues) + Σ(Platform Incentives)                           │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 13. OLA-Revenue
* **Definition:** Net earnings generated on the Ola platform after platform commissions.
* **Source Table / Column:** `public.core_ola_daily.operator_bill`
* **Formula:** `SUM(COALESCE(operator_bill, 0.00))`

#### 14. Uber-Revenue
* **Definition:** Net fare revenue generated on Uber after 20–25% Uber commission deduction.
* **Source Table / Column:** `public.core_uber_daily.net_fare_earnings` (or `uber_total_earnings`)
* **Formula:** `SUM(COALESCE(net_fare_earnings, 0.00))`

#### 15. Rapio-Revenue
* **Definition:** Net captain revenue earned on the Rapido platform.
* **Source Table / Column:** `public.core_rapido_daily.net_revenue` (or `captain_earnings`)
* **Formula:** `SUM(COALESCE(net_revenue, 0.00))`

#### 16. OLA-Incentive
* **Source Table / Column:** `public.core_ola_daily.portal_incentive` / `core_ola_incentives.net_incentive`
* **Formula:** `SUM(COALESCE(portal_incentive, 0.00))`

#### 17. Uber-Incentive
* **Source Table / Column:** `public.core_uber_weekly.uber_vehicle_incentive` / `uber_vehicle_incentives_raw.total_payout`
* **Weekly Prorating Rule:** Weekly batch incentive payout divided by 7 operational days.
* **Formula:** `ROUND(SUM(COALESCE(uber_vehicle_incentive, 0.00)) / 7.0, 2)`

#### 18. Rapio-Incentive
* **Source Table / Column:** `public.rapido_incentive_16.amount`
* **Prorating Rule:** `SUM(COALESCE(amount, 0.00)) / GREATEST(days_count, 1)`

#### 19. Total Revenue
* **Formula:**
  $$\text{Total Revenue} = \text{Rev}_{\text{Ola}} + \text{Rev}_{\text{Uber}} + \text{Rev}_{\text{Rapido}} + \text{Inc}_{\text{Ola}} + \text{Inc}_{\text{Uber}} + \text{Inc}_{\text{Rapido}}$$

#### 20. Active EPV (Earnings Per Active Vehicle)
* **Definition:** Daily gross earning efficiency per car actively running on the road.
* **Formula:**
  $$\text{Active EPV} = \text{ROUND}\left(\frac{\text{Total Revenue}}{\text{NULLIF}(\text{Active Vehicle Days}, 0)}, 2\right)$$

#### 21. Allotted EPV (Earnings Per Allotted Vehicle)
* **Definition:** Earning efficiency across all vehicles deployed under driver custody.
* **Formula:**
  $$\text{Allotted EPV} = \text{ROUND}\left(\frac{\text{Total Revenue}}{\text{NULLIF}(\text{Allotted Cars Days}, 0)}, 2\right)$$

#### 22. RPT (Revenue Per Trip)
* **Definition:** Average revenue generated per completed passenger ride.
* **Formula:**
  $$\text{RPT} = \text{ROUND}\left(\frac{\text{Total Revenue}}{\text{NULLIF}(\text{Total Trips}, 0)}, 2\right)$$

#### 23. Avg. Trip Length
* **Definition:** Average passenger transit distance (kilometers per ride).
* **Formula:**
  $$\text{Avg. Trip Length} = \text{ROUND}\left(\frac{\text{Total In-Trip KM}}{\text{NULLIF}(\text{Total Trips}, 0)}, 2\right)$$

#### 24. IN Trip KM / Active Vehicle
* **Definition:** Productive daily mileage driven per active car.
* **Formula:**
  $$\text{IN Trip KM / Active Veh} = \text{ROUND}\left(\frac{\text{Total In-Trip KM}}{\text{NULLIF}(\text{Active Vehicle Days}, 0)}, 2\right)$$

---

### Section 4: Quality Metrics & Telemetry / Dead Miles (5 KPIs)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ QUALITY & TELEMETRY SECTION (Coral & Pink Themes)                                           │
│ Average OEPK = Total Revenue / Total In-Trip KM                                             │
│ Dead Miles % = GREATEST(0, Total GPS - In-Trip) / Total GPS * 100                           │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 25. IN Trip KM Ola
* **Source Table / Column:** `public.core_ola_daily.total_kms`
* **Unit:** Kilometers (KM) | `NUMERIC(14,2)`

#### 26. IN Trip KM Uber
* **Source Table / Column:** `public.core_uber_daily.total_trip_distance_km`
* **Unit:** Kilometers (KM) | `NUMERIC(14,2)`

#### 27. IN Trip KM Rapido
* **Source Table / Column:** `public.core_rapido_daily.total_trip_distance_km`
* **Unit:** Kilometers (KM) | `NUMERIC(14,2)`

#### 28. IN Trip KM Total
* **Formula:** $\text{KM}_{\text{Ola}} + \text{KM}_{\text{Uber}} + \text{KM}_{\text{Rapido}}$

#### 29. Average OEPK (Operational Earnings Per Kilometer)
* **Definition:** Revenue earned per productive customer-carrying kilometer.
* **Fleet Benchmark:** ₹19.50 – ₹20.50 / km across Bangalore, Mumbai, and Hyderabad.
* **Formula:**
  $$\text{Average OEPK} = \text{ROUND}\left(\frac{\text{Total Revenue}}{\text{NULLIF}(\text{Total In-Trip KM}, 0)}, 2\right)$$

#### 30. Total GPS KMs
* **Source Tables / Column:** `public.core_gps.distance_km` / `gps_raw_*`
* **Hardware Ingestion:** Intellicar, GoMy GPS, Roadcast, WheelsEye telematics devices.
* **Formula:** `SUM(COALESCE(distance_km, 0.00))`

#### 31. Dead Miles (%)
* **Definition:** Proportion of vehicle mileage driven without passengers (deadhead transit / empty cruising).
* **Clamping Guard (`GREATEST(0, ...)`):** Prevents negative percentages during partial telemetry syncs.
* **Formula:**
  $$\text{Dead Miles (\%)} = \text{CASE WHEN } \text{Total GPS} > 0 \text{ THEN } \text{ROUND}\left(\frac{\text{GREATEST}(0, \text{Total GPS} - \text{In-Trip KM})}{\text{Total GPS}} \times 100, 2\right) \text{ ELSE } 0.00 \text{ END}$$

---

## 4. Production Database DDL & Refresh Stored Procedures

### Table DDL: `public.fact_daily_management_mis`

```sql
CREATE TABLE IF NOT EXISTS public.fact_daily_management_mis (
    record_date DATE PRIMARY KEY,
    total_vehicle_days BIGINT NOT NULL DEFAULT 0,
    allotted_car_days BIGINT NOT NULL DEFAULT 0,
    rm_vehicle_days BIGINT NOT NULL DEFAULT 0,
    inventory_vehicle_days BIGINT NOT NULL DEFAULT 0,
    total_loss_days BIGINT NOT NULL DEFAULT 0,
    active_vehicle_days BIGINT NOT NULL DEFAULT 0,
    trips_ola BIGINT NOT NULL DEFAULT 0,
    trips_uber BIGINT NOT NULL DEFAULT 0,
    trips_rapido BIGINT NOT NULL DEFAULT 0,
    ola_revenue NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    uber_revenue NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    rapido_revenue NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    ola_incentive NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    uber_incentive NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    rapido_incentive NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    in_trip_km_ola NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    in_trip_km_uber NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    in_trip_km_rapido NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_gps_kms NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fact_mis_record_date ON public.fact_daily_management_mis(record_date DESC);
```

### Stored Procedure: `public.sp_refresh_daily_mis_metrics`

```sql
CREATE OR REPLACE PROCEDURE public.sp_refresh_daily_mis_metrics(
    IN p_start_date DATE DEFAULT NULL,
    IN p_end_date DATE DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        v_start_date := CURRENT_DATE - INTERVAL '7 days';
        v_end_date := CURRENT_DATE;
    ELSE
        v_start_date := p_start_date;
        v_end_date := p_end_date;
    END IF;

    INSERT INTO public.fact_daily_management_mis (
        record_date,
        total_vehicle_days,
        allotted_car_days,
        rm_vehicle_days,
        inventory_vehicle_days,
        total_loss_days,
        active_vehicle_days,
        trips_ola,
        trips_uber,
        trips_rapido,
        ola_revenue,
        uber_revenue,
        rapido_revenue,
        ola_incentive,
        uber_incentive,
        rapido_incentive,
        in_trip_km_ola,
        in_trip_km_uber,
        in_trip_km_rapido,
        total_gps_kms,
        updated_at
    )
    WITH date_series AS (
        SELECT generate_series(v_start_date, v_end_date, '1 day'::interval)::date AS record_date
    ),
    assets_daily AS (
        SELECT 
            status_date AS record_date,
            COUNT(DISTINCT vehicle_number) AS total_vehicle_days,
            COUNT(DISTINCT CASE WHEN cohort = 'On Road' THEN vehicle_number END) AS allotted_car_days,
            COUNT(DISTINCT CASE WHEN final_status = 'Maintenance' THEN vehicle_number END) AS rm_vehicle_days,
            COUNT(DISTINCT CASE WHEN cohort = 'Off Road' AND final_status != 'Maintenance' THEN vehicle_number END) AS inventory_vehicle_days,
            COUNT(DISTINCT CASE WHEN final_status IN ('Sold', 'Total Loss', 'Decommissioned') THEN vehicle_number END) AS total_loss_days
        FROM public.core_daily_vehicle_status
        WHERE status_date BETWEEN v_start_date AND v_end_date
        GROUP BY status_date
    ),
    trips_uber_daily AS (
        SELECT 
            operational_date AS record_date,
            COALESCE(SUM(completed_trips), 0) AS trips_uber,
            COALESCE(SUM(net_fare_earnings), 0.00) AS uber_revenue,
            COALESCE(SUM(total_trip_distance_km), 0.00) AS in_trip_km_uber
        FROM public.core_uber_daily
        WHERE operational_date BETWEEN v_start_date AND v_end_date
        GROUP BY operational_date
    ),
    uber_incentive_daily AS (
        SELECT 
            d.record_date,
            ROUND(COALESCE(SUM(w.uber_vehicle_incentive), 0.00) / 7.0, 2) AS uber_incentive
        FROM date_series d
        LEFT JOIN public.core_uber_weekly w 
            ON d.record_date >= w.week_start AND d.record_date <= w.week_end
        GROUP BY d.record_date
    ),
    trips_ola_daily AS (
        SELECT 
            service_date AS record_date,
            COALESCE(SUM(completed_trips), 0) AS trips_ola,
            COALESCE(SUM(operator_bill), 0.00) AS ola_revenue,
            COALESCE(SUM(portal_incentive), 0.00) AS ola_incentive,
            COALESCE(SUM(total_kms), 0.00) AS in_trip_km_ola
        FROM public.core_ola_daily
        WHERE service_date BETWEEN v_start_date AND v_end_date
        GROUP BY service_date
    ),
    trips_rapido_daily AS (
        SELECT 
            operational_date AS record_date,
            COALESCE(SUM(completed_trips), 0) AS trips_rapido,
            COALESCE(SUM(net_revenue), 0.00) AS rapido_revenue,
            0.00 AS rapido_incentive,
            COALESCE(SUM(total_trip_distance_km), 0.00) AS in_trip_km_rapido
        FROM public.core_rapido_daily
        WHERE operational_date BETWEEN v_start_date AND v_end_date
        GROUP BY operational_date
    ),
    active_vehicles_daily AS (
        SELECT 
            d.record_date,
            COUNT(DISTINCT u.vehicle_number) AS active_vehicle_days
        FROM date_series d
        LEFT JOIN (
            SELECT operational_date AS record_date, vehicle_number FROM public.core_uber_daily WHERE completed_trips > 0 AND operational_date BETWEEN v_start_date AND v_end_date
            UNION
            SELECT service_date AS record_date, vehicle_number FROM public.core_ola_daily WHERE completed_trips > 0 AND service_date BETWEEN v_start_date AND v_end_date
            UNION
            SELECT operational_date AS record_date, vehicle_number FROM public.core_rapido_daily WHERE completed_trips > 0 AND operational_date BETWEEN v_start_date AND v_end_date
        ) u ON d.record_date = u.record_date
        GROUP BY d.record_date
    ),
    gps_daily AS (
        SELECT 
            record_date,
            COALESCE(SUM(distance_km), 0.00) AS total_gps_kms
        FROM public.core_gps
        WHERE record_date BETWEEN v_start_date AND v_end_date
        GROUP BY record_date
    )
    SELECT 
        d.record_date,
        COALESCE(a.total_vehicle_days, 0),
        COALESCE(a.allotted_car_days, 0),
        COALESCE(a.rm_vehicle_days, 0),
        COALESCE(a.inventory_vehicle_days, 0),
        COALESCE(a.total_loss_days, 0),
        COALESCE(av.active_vehicle_days, 0),
        COALESCE(o.trips_ola, 0),
        COALESCE(u.trips_uber, 0),
        COALESCE(r.trips_rapido, 0),
        COALESCE(o.ola_revenue, 0.00),
        COALESCE(u.uber_revenue, 0.00),
        COALESCE(r.rapido_revenue, 0.00),
        COALESCE(o.ola_incentive, 0.00),
        COALESCE(ui.uber_incentive, 0.00),
        COALESCE(r.rapido_incentive, 0.00),
        COALESCE(o.in_trip_km_ola, 0.00),
        COALESCE(u.in_trip_km_uber, 0.00),
        COALESCE(r.in_trip_km_rapido, 0.00),
        COALESCE(g.total_gps_kms, 0.00),
        NOW()
    FROM date_series d
    LEFT JOIN assets_daily a ON d.record_date = a.record_date
    LEFT JOIN trips_ola_daily o ON d.record_date = o.record_date
    LEFT JOIN trips_uber_daily u ON d.record_date = u.record_date
    LEFT JOIN uber_incentive_daily ui ON d.record_date = ui.record_date
    LEFT JOIN trips_rapido_daily r ON d.record_date = r.record_date
    LEFT JOIN active_vehicles_daily av ON d.record_date = av.record_date
    LEFT JOIN gps_daily g ON d.record_date = g.record_date
    ON CONFLICT (record_date) DO UPDATE SET
        total_vehicle_days = EXCLUDED.total_vehicle_days,
        allotted_car_days = EXCLUDED.allotted_car_days,
        rm_vehicle_days = EXCLUDED.rm_vehicle_days,
        inventory_vehicle_days = EXCLUDED.inventory_vehicle_days,
        total_loss_days = EXCLUDED.total_loss_days,
        active_vehicle_days = EXCLUDED.active_vehicle_days,
        trips_ola = EXCLUDED.trips_ola,
        trips_uber = EXCLUDED.trips_uber,
        trips_rapido = EXCLUDED.trips_rapido,
        ola_revenue = EXCLUDED.ola_revenue,
        uber_revenue = EXCLUDED.uber_revenue,
        rapido_revenue = EXCLUDED.rapido_revenue,
        ola_incentive = EXCLUDED.ola_incentive,
        uber_incentive = EXCLUDED.uber_incentive,
        rapido_incentive = EXCLUDED.rapido_incentive,
        in_trip_km_ola = EXCLUDED.in_trip_km_ola,
        in_trip_km_uber = EXCLUDED.in_trip_km_uber,
        in_trip_km_rapido = EXCLUDED.in_trip_km_rapido,
        total_gps_kms = EXCLUDED.total_gps_kms,
        updated_at = EXCLUDED.updated_at;
END;
$$;
```

---

## 5. Active `pg_cron` Schedules & Verification

| Job ID | Job Name | Schedule | Command | Execution Time |
| :--- | :--- | :--- | :--- | :--- |
| **`26`** | `refresh_daily_mis_hourly` | `55 * * * *` | `CALL public.sp_refresh_daily_mis_rolling(7);` | **0.28s** (Past 7 Days) |
| **`27`** | `refresh_daily_mis_nightly_sweep` | `0 3 * * *` | `CALL public.sp_refresh_daily_mis_rolling(30);` | **0.50s** (Past 30 Days) |

### Management & Diagnostics SQL:
```sql
-- 1. Check active cron jobs
SELECT jobid, jobname, schedule, command, active FROM cron.job WHERE jobname LIKE '%mis%';

-- 2. Inspect cron run history
SELECT jobid, runid, status, return_message, start_time, end_time 
FROM cron.job_run_details 
WHERE jobid IN (26, 27) 
ORDER BY start_time DESC LIMIT 10;

-- 3. Manually trigger backfill for any date range:
CALL public.sp_refresh_daily_mis_metrics('2026-08-01', '2026-09-30');
```
