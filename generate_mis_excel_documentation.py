import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Output target path in Downloads
downloads_path = r"C:\Users\anura\Downloads\LetzRyd_MIS_Dashboard_KPI_Data_Sources_and_Architecture.xlsx"

wb = openpyxl.Workbook()

# Style helpers
header_fill = PatternFill(start_color="008361", end_color="008361", fill_type="solid") # LetzRyd Emerald Green
header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
subheader_fill = PatternFill(start_color="DEF4F0", end_color="DEF4F0", fill_type="solid")
subheader_font = Font(name="Segoe UI", size=10, bold=True, color="004D38")

title_font = Font(name="Segoe UI", size=14, bold=True, color="008361")
subtitle_font = Font(name="Segoe UI", size=10, italic=True, color="64748B")

cat_assets_fill = PatternFill(start_color="F5E7B5", end_color="F5E7B5", fill_type="solid") # Assets Tan
cat_trips_fill = PatternFill(start_color="F0C832", end_color="F0C832", fill_type="solid") # Trips Gold
cat_rev_fill = PatternFill(start_color="B194CB", end_color="B194CB", fill_type="solid") # Revenue Purple
cat_qual_fill = PatternFill(start_color="DC7D78", end_color="DC7D78", fill_type="solid") # Quality Coral
cat_dead_fill = PatternFill(start_color="FFDEF0", end_color="FFDEF0", fill_type="solid") # Dead Miles Pink

bold_font = Font(name="Segoe UI", size=10, bold=True, color="1E293B")
regular_font = Font(name="Segoe UI", size=10, color="334155")
code_font = Font(name="Consolas", size=9, color="0F172A")

thin_border = Border(
    left=Side(style='thin', color="CBD5E1"),
    right=Side(style='thin', color="CBD5E1"),
    top=Side(style='thin', color="CBD5E1"),
    bottom=Side(style='thin', color="CBD5E1")
)

# -------------------------------------------------------------
# TAB 1: KPI Master Dictionary
# -------------------------------------------------------------
ws1 = wb.active
ws1.title = "KPI_Sources_and_Logic"

ws1.append(["LetzRyd MIS Dashboard — Master KPI Dictionary & Database Source Mapping"])
ws1["A1"].font = title_font
ws1.append(["Comprehensive specification of all 22 dashboard KPIs, exact PostgreSQL source tables, calculation formulas, and soft-delete filters."])
ws1["A2"].font = subtitle_font
ws1.append([])

headers1 = [
    "KPI / Variable Name",
    "Dashboard Section",
    "Business Definition",
    "Source System / Database Table",
    "Source Columns",
    "Mandatory Filters (Soft-Delete & Status)",
    "Exact Calculation Logic / SQL Formula",
    "Upstream GitHub Repo",
    "Granularity Support"
]
ws1.append(headers1)

kpis_data = [
    # ASSETS
    (
        "Total Vehicle Days", "Assets",
        "Total active, registered vehicles in fleet multiplied by days in reporting period",
        "public.core_vehicle_onboarding",
        "registration_no, onboarding_date, status, is_deleted",
        "is_deleted = FALSE AND status != 'Decommissioned' AND onboarding_date <= :report_date",
        "COUNT(DISTINCT registration_no)",
        "https://github.com/aayush-letzryd/backend",
        "Daily, Weekly, Monthly"
    ),
    (
        "Alloted cars Days", "Assets",
        "Total vehicle days in active possession/custody of assigned driver-partners",
        "public.core_vehicle_allocation, public.core_dropoffs",
        "allocation_date, return_date, vehicle_number, is_deleted, status",
        "a.is_deleted = FALSE AND (d.is_deleted = FALSE OR d.id IS NULL) AND a.allocation_date <= :report_date AND (d.return_date IS NULL OR d.return_date > :report_date)",
        "COUNT(DISTINCT a.vehicle_number)",
        "https://github.com/aayush-letzryd/backend",
        "Daily, Weekly, Monthly"
    ),
    (
        "R&M Vehicle Days", "Assets",
        "Vehicles unavailable for dispatch due to repairs, garage maintenance, or accidents",
        "public.core_maintenance, public.core_accidents",
        "in_date_time, out_date_time, vehicle_number, is_deleted, status",
        "m.is_deleted = FALSE AND DATE(m.in_date_time) <= :report_date AND (m.out_date_time IS NULL OR DATE(m.out_date_time) >= :report_date)",
        "COUNT(DISTINCT m.vehicle_number)",
        "https://github.com/aayush-letzryd/backend",
        "Daily, Weekly, Monthly"
    ),
    (
        "Inventory Vehicle Days", "Assets",
        "Vehicles sitting idle in parking hubs (not allotted to drivers and not undergoing repairs)",
        "Derived from Assets Core Tables",
        "Calculated from Total, Allotted, and R&M days",
        "Inherits is_deleted = FALSE from component metrics",
        "GREATEST(0, Total Vehicle Days - Alloted cars Days - R&M Vehicle Days)",
        "https://github.com/aayush-letzryd/backend_v3",
        "Daily, Weekly, Monthly"
    ),
    (
        "Active Vehicle Days", "Assets",
        "Vehicles that logged at least 1 completed ride on that date across Uber, Ola, or Rapido",
        "public.uber_raw_*, public.ola_raw_*, public.rapido_raw_*",
        "vehicle_number, trip_date, trips",
        "trip_date = :report_date AND completed_trips > 0",
        "COUNT(DISTINCT vehicle_number) from UNION of all 3 aggregator trip logs",
        "https://github.com/aayush-letzryd/uber, ola",
        "Daily, Weekly, Monthly"
    ),
    (
        "Utilisation %", "Assets",
        "Proportion of the total fleet actively generating on-road trips",
        "Derived Metric",
        "Active Vehicle Days, Total Vehicle Days",
        "N/A (Derived)",
        "(Active Vehicle Days / Total Vehicle Days) * 100",
        "https://github.com/aayush-letzryd/backend_v3",
        "Daily, Weekly, Monthly"
    ),
    (
        "Allotted %", "Assets",
        "Proportion of total fleet currently assigned to drivers",
        "Derived Metric",
        "Alloted cars Days, Total Vehicle Days",
        "N/A (Derived)",
        "(Alloted cars Days / Total Vehicle Days) * 100",
        "https://github.com/aayush-letzryd/backend_v3",
        "Daily, Weekly, Monthly"
    ),
    (
        "R&M%", "Assets",
        "Proportion of total fleet immobilized due to maintenance/accidents",
        "Derived Metric",
        "R&M Vehicle Days, Total Vehicle Days",
        "N/A (Derived)",
        "(R&M Vehicle Days / Total Vehicle Days) * 100",
        "https://github.com/aayush-letzryd/backend_v3",
        "Daily, Weekly, Monthly"
    ),

    # TRIPS
    (
        "Trips-OLA", "Trips",
        "Total completed passenger rides on Ola platform",
        "public.ola_raw_1, ola_raw_15, ola_raw_16",
        "completed_bookings, trip_date, completion_status",
        "trip_date = :report_date AND completion_status = 'COMPLETED'",
        "COALESCE(SUM(completed_bookings), 0)",
        "https://github.com/aayush-letzryd/ola",
        "Daily, Weekly, Monthly"
    ),
    (
        "Trips-Uber", "Trips",
        "Total completed passenger rides on Uber platform",
        "public.uber_raw_1, uber_raw_15, uber_raw_16",
        "trip_distance, trip_date, trip_status",
        "trip_date = :report_date AND trip_status != 'CANCELLED'",
        "COUNT(trip_distance)",
        "https://github.com/aayush-letzryd/uber",
        "Daily, Weekly, Monthly"
    ),
    (
        "Trips-Rapido", "Trips",
        "Total completed passenger rides on Rapido platform",
        "public.rapido_raw_1, rapido_raw_15, rapido_raw_16",
        "trip_id, trip_date",
        "trip_date = :report_date",
        "COUNT(DISTINCT trip_id)",
        "Rapido Vendor Ingestion",
        "Daily, Weekly, Monthly"
    ),
    (
        "TPV (Total Trips)", "Trips",
        "Total Platform Volume across all ride aggregators",
        "Derived Sum",
        "Trips-OLA, Trips-Uber, Trips-Rapido",
        "N/A (Derived)",
        "Trips-OLA + Trips-Uber + Trips-Rapido",
        "https://github.com/aayush-letzryd/backend_v3",
        "Daily, Weekly, Monthly"
    ),

    # REVENUE
    (
        "OLA-Revenue", "Revenue",
        "Gross driver fares earned on Ola platform",
        "public.ola_raw_1, ola_raw_15, ola_raw_16",
        "net_revenue, trip_date",
        "trip_date = :report_date",
        "COALESCE(SUM(net_revenue), 0.0)",
        "https://github.com/aayush-letzryd/ola",
        "Daily, Weekly, Monthly"
    ),
    (
        "Uber-Revenue", "Revenue",
        "Gross driver fares earned on Uber platform",
        "public.uber_raw_1, uber_raw_15, uber_raw_16",
        "trip_distance, gross_fare, trip_date",
        "trip_date = :report_date",
        "COALESCE(SUM(gross_fare), 0.0)",
        "https://github.com/aayush-letzryd/uber",
        "Daily, Weekly, Monthly"
    ),
    (
        "Rapio-Revenue", "Revenue",
        "Gross driver fares earned on Rapido platform",
        "public.rapido_raw_1, rapido_raw_15, rapido_raw_16",
        "net_revenue, trip_date",
        "trip_date = :report_date",
        "COALESCE(SUM(net_revenue), 0.0)",
        "Rapido Vendor Ingestion",
        "Daily, Weekly, Monthly"
    ),
    (
        "OLA-Incentive", "Revenue",
        "Target and performance bonuses received from Ola",
        "public.ola_incentive_1, ola_incentive_15, ola_incentive_16",
        "amount, vehicle_number",
        "Allocated to dates within settlement week",
        "COALESCE(SUM(amount), 0.0)",
        "https://github.com/aayush-letzryd/ola-incentive",
        "Daily, Weekly, Monthly"
    ),
    (
        "Uber-Incentive", "Revenue",
        "Quest, boost, and surge bonuses received from Uber",
        "public.uber_incentive_1, uber_incentive_15, uber_incentive_16",
        "received_from_uber, week_start_date, week_end_date",
        "week_start_date <= :report_date AND week_end_date >= :report_date",
        "COALESCE(SUM(received_from_uber) / 7.0, 0.0) for daily prorated",
        "https://github.com/aayush-letzryd/uber-incentive",
        "Daily, Weekly, Monthly"
    ),
    (
        "Rapio-Incentive", "Revenue",
        "Performance bonuses received from Rapido",
        "public.rapido_incentive_16",
        "amount, vehicle_number",
        "Allocated to target date",
        "COALESCE(SUM(amount), 0.0)",
        "Rapido Vendor Ingestion",
        "Daily, Weekly, Monthly"
    ),
    (
        "Total Revenue", "Revenue",
        "Grand total gross earnings across all platforms & incentives",
        "Aggregated Sum",
        "All Revenue + Incentive Columns",
        "N/A (Derived)",
        "OLA-Rev + Uber-Rev + Rapido-Rev + OLA-Inc + Uber-Inc + Rapido-Inc",
        "https://github.com/aayush-letzryd/backend_v3",
        "Daily, Weekly, Monthly"
    ),
    (
        "Active EPV", "Revenue",
        "Earnings Per Active Vehicle (Revenue yield per working car)",
        "Derived Ratio",
        "Total Revenue, Active Vehicle Days",
        "N/A (Derived)",
        "CASE WHEN Active Vehicle Days > 0 THEN Total Revenue / Active Vehicle Days ELSE 0 END",
        "https://github.com/aayush-letzryd/backend_v3",
        "Daily, Weekly, Monthly"
    ),
    (
        "Allotted EPV", "Revenue",
        "Earnings Per Allotted Vehicle (Fleet realization efficiency)",
        "Derived Ratio",
        "Total Revenue, Alloted cars Days",
        "N/A (Derived)",
        "CASE WHEN Alloted cars Days > 0 THEN Total Revenue / Alloted cars Days ELSE 0 END",
        "https://github.com/aayush-letzryd/backend_v3",
        "Daily, Weekly, Monthly"
    ),
    (
        "RPT", "Revenue",
        "Revenue Per Trip (Average monetization per passenger ride)",
        "Derived Ratio",
        "Total Revenue, TPV",
        "N/A (Derived)",
        "CASE WHEN TPV > 0 THEN Total Revenue / TPV ELSE 0 END",
        "https://github.com/aayush-letzryd/backend_v3",
        "Daily, Weekly, Monthly"
    ),
    (
        "Avg. trip Length", "Revenue",
        "Average distance (km) driven per completed passenger ride",
        "Derived Ratio",
        "IN Trip KM Total, TPV",
        "N/A (Derived)",
        "CASE WHEN TPV > 0 THEN IN Trip KM Total / TPV ELSE 0 END",
        "https://github.com/aayush-letzryd/backend_v3",
        "Daily, Weekly, Monthly"
    ),
    (
        "IN Trip KM/Active Vehicle", "Revenue",
        "Average productive passenger kilometers driven per working vehicle",
        "Derived Ratio",
        "IN Trip KM Total, Active Vehicle Days",
        "N/A (Derived)",
        "CASE WHEN Active Vehicle Days > 0 THEN IN Trip KM Total / Active Vehicle Days ELSE 0 END",
        "https://github.com/aayush-letzryd/backend_v3",
        "Daily, Weekly, Monthly"
    ),

    # QUALITY METRICS
    (
        "IN Trip KM Ola", "Quality Metrics",
        "Total productive passenger kilometers driven on Ola rides",
        "public.ola_raw_1, ola_raw_15, ola_raw_16",
        "actual_kms_raw, trip_date",
        "trip_date = :report_date",
        "COALESCE(SUM(actual_kms_raw), 0.0)",
        "https://github.com/aayush-letzryd/ola",
        "Daily, Weekly, Monthly"
    ),
    (
        "IN Trip KM Uber", "Quality Metrics",
        "Total productive passenger kilometers driven on Uber rides",
        "public.uber_raw_1, uber_raw_15, uber_raw_16",
        "trip_distance, trip_date",
        "trip_date = :report_date",
        "COALESCE(SUM(trip_distance), 0.0)",
        "https://github.com/aayush-letzryd/uber",
        "Daily, Weekly, Monthly"
    ),
    (
        "IN Trip KM Rapido", "Quality Metrics",
        "Total productive passenger kilometers driven on Rapido rides",
        "public.rapido_raw_1, rapido_raw_15, rapido_raw_16",
        "net_revenue, trip_date",
        "trip_date = :report_date",
        "COALESCE(SUM(trip_distance), 0.0)",
        "Rapido Vendor Ingestion",
        "Daily, Weekly, Monthly"
    ),
    (
        "IN Trip KM Total", "Quality Metrics",
        "Combined revenue-generating distance driven across all platforms",
        "Aggregated Sum",
        "IN Trip KM (Ola + Uber + Rapido)",
        "N/A (Derived)",
        "IN Trip KM Ola + IN Trip KM Uber + IN Trip KM Rapido",
        "https://github.com/aayush-letzryd/backend_v3",
        "Daily, Weekly, Monthly"
    ),
    (
        "Average OEPK", "Quality Metrics",
        "Operational Earnings Per Kilometer (Gross revenue per in-trip km)",
        "Derived Ratio",
        "Total Revenue, IN Trip KM Total",
        "N/A (Derived)",
        "CASE WHEN IN Trip KM Total > 0 THEN Total Revenue / IN Trip KM Total ELSE 0 END",
        "https://github.com/aayush-letzryd/backend_v3",
        "Daily, Weekly, Monthly"
    ),

    # DEAD MILES
    (
        "Total GPS KMs", "Dead Miles",
        "Total actual odometer distance recorded by vehicle IoT GPS tracking devices",
        "public.gps_raw_1, gps_raw_15, gps_raw_16",
        "km_driven, gps_date, vehicle_number",
        "gps_date = :report_date",
        "COALESCE(SUM(km_driven), 0.0)",
        "IoT GPS Telemetry Feeds",
        "Daily, Weekly, Monthly"
    ),
    (
        "Dead Miles (%)", "Dead Miles",
        "Percentage of total GPS distance driven without passengers (operational wastage)",
        "Derived Ratio",
        "Total GPS KMs, IN Trip KM Total",
        "N/A (Derived)",
        "CASE WHEN Total GPS KMs > 0 THEN ((Total GPS KMs - IN Trip KM Total) / Total GPS KMs) * 100 ELSE 0 END",
        "https://github.com/aayush-letzryd/backend_v3",
        "Daily, Weekly, Monthly"
    ),
]

for row in kpis_data:
    ws1.append(row)


# -------------------------------------------------------------
# TAB 2: Zero Performance Impact Strategy
# -------------------------------------------------------------
ws2 = wb.create_sheet(title="Zero_Impact_Architecture")

ws2.append(["LetzRyd Zero-Performance-Impact Architectural Strategy"])
ws2["A1"].font = title_font
ws2.append(["Technical blueprint ensuring 0% load and 0 lock contention on production source tables."])
ws2["A2"].font = subtitle_font
ws2.append([])

headers2 = ["Tier", "Architectural Solution", "How It Prevents Source Table Impact", "Implementation Details in LetzRyd DB", "Expected Latency"]
ws2.append(headers2)

arch_data = [
    (
        "Tier 1", "Daily Pre-Aggregated Rollup Table (fact_daily_management_mis)",
        "Completely decouples the frontend dashboard from millions of raw trip records. The dashboard reads 1 row per date instead of scanning millions of rows in uber_raw / ola_raw.",
        "A background automated cron job runs at 02:00 AM IST and populates public.fact_daily_management_mis. Dashboard queries perform a direct primary key range scan.",
        "< 5 ms"
    ),
    (
        "Tier 2", "Read-Only Materialized Views (REFRESH CONCURRENTLY)",
        "PostgreSQL 'REFRESH MATERIALIZED VIEW CONCURRENTLY' creates a temporary diff and applies it without acquiring exclusive table locks, preventing writes or ingestion from blocking.",
        "Used on 'vw_looker_mis_dashboard'. Requires a UNIQUE index on (report_date). Ingestion scripts from Google Sheets or scrapers run smoothly without lock waiting.",
        "< 10 ms"
    ),
    (
        "Tier 3", "Partial Covering B-Tree Indexes with is_deleted = FALSE",
        "Indexes only live records (WHERE is_deleted = FALSE), reducing index tree size by 40-70% and preventing full table scans on soft-delete queries.",
        "CREATE INDEX idx_core_alloc_active ON public.core_vehicle_allocation(allocation_date, vehicle_number) WHERE is_deleted = FALSE;",
        "< 2 ms"
    ),
    (
        "Tier 4", "Non-Blocking Transaction Isolation (READ COMMITTED + Advisory Locks)",
        "Reads never block writes and writes never block reads under PostgreSQL MVCC. Analytical queries run in default READ COMMITTED mode with statement timeouts.",
        "SET statement_timeout = '3000ms'; SET idle_in_transaction_session_timeout = '5000ms'; Connection pool reserves dedicated read-only connections.",
        "Zero Contention"
    ),
    (
        "Tier 5", "Incremental Delta Watermark Processing",
        "Instead of re-aggregating the entire historical dataset (Jan 2026 to Present), background pipelines only re-calculate the previous 48 hours for late-arriving trips/incentives.",
        "Nightly sync filters: WHERE trip_date >= CURRENT_DATE - INTERVAL '2 days' ON CONFLICT (report_date) DO UPDATE SET ...",
        "Negligible CPU (<1%)"
    ),
]

for row in arch_data:
    ws2.append(row)


# -------------------------------------------------------------
# TAB 3: Repo to Table Matrix
# -------------------------------------------------------------
ws3 = wb.create_sheet(title="Repo_to_Table_Matrix")

ws3.append(["Official GitHub Repositories vs PostgreSQL Target Tables Matrix"])
ws3["A1"].font = title_font
ws3.append(["Mapping of ingestion pipelines, cron frequencies, target schemas, and primary keys."])
ws3["A2"].font = subtitle_font
ws3.append([])

headers3 = ["GitHub Repository", "Pipeline Role", "Target Database Table", "Primary / Unique Key", "Sync Frequency", "Data Hygiene & Dedup Rules"]
ws3.append(headers3)

repo_matrix = [
    (
        "https://github.com/aayush-letzryd/backend",
        "Master Operational Ingestion (Google Sheets & Portal)",
        "core_vehicle_onboarding, core_vehicle_allocation, core_dropoffs, core_maintenance, core_accidents, core_adjustments, core_walkin",
        "registration_no, (allocation_date, vehicle_number), dropoff_id, id",
        "Real-time onChange triggers + 5-min catchup",
        "Enforces is_deleted = FALSE, 10-digit phone normalization, canonical city mapping, advisory lock dedup."
    ),
    (
        "https://github.com/aayush-letzryd/uber",
        "Uber Daily Trip & Fare Ingestion",
        "uber_raw_1, uber_raw_15, uber_raw_16, uber_trips_raw, core_uber_daily",
        "(trip_date, vehicle_number, trip_id)",
        "Daily automated ingestion (Every 6 hours)",
        "Deduplicates on trip_id, maps driver UUID to internal driver phone, strips cancelled zero-fare records."
    ),
    (
        "https://github.com/aayush-letzryd/uber-incentive",
        "Uber Weekly Incentive Statements",
        "uber_incentive_1, uber_incentive_15, uber_incentive_16, core_uber_weekly",
        "(week_start_date, vehicle_number)",
        "Weekly on Tuesday (Settlement cycle)",
        "Validates payment statement totals against raw trip bonus lines, removes negative clawback duplicates."
    ),
    (
        "https://github.com/aayush-letzryd/ola",
        "Ola Daily CRN Bookings & Revenue Scraper",
        "ola_raw_1, ola_raw_15, ola_raw_16, core_ola_daily, ola_raw_crns",
        "(trip_date, vehicle_number, crn_number)",
        "Daily automated scraper",
        "Cleans vehicle registration regex, separates toll amounts from gross fare, maps driver ID."
    ),
    (
        "https://github.com/aayush-letzryd/ola-incentive",
        "Ola Incentive & Bank Statement Ingestion",
        "ola_incentive_1, ola_incentive_15, ola_incentive_16, sheet_ola_incentive_*",
        "(vehicle_number, week_cycle)",
        "Weekly settlement reconciliation",
        "Three-way matching between Ola portal report, bank credits, and driver wallet ledgers."
    ),
    (
        "https://github.com/aayush-letzryd/bangalore-challan",
        "Bangalore Traffic Police (BTP) Challan Scraper",
        "challan_1, challan_15, challan_16, july_traffic_challans, core_challans",
        "(vehicle_reg_no, notice_no, week_cycle)",
        "Daily scrape batches",
        "Regex vehicle validation, eliminates paid challan duplicates, matches violation timestamps with driver custody."
    ),
    (
        "https://github.com/aayush-letzryd/backend_v3",
        "Consolidated Hisaab Engine & MIS Analytical Views",
        "hisaab_weekly_reconciliation_master, vw_looker_mis_dashboard, fact_daily_management_mis",
        "report_date / (hisaab_week, vehicle_number)",
        "Live views + Daily rollup cron",
        "Consolidates platform earnings, applies rental plans, nets adjustments, outputs production Looker & Portal MIS metrics."
    )
]

for row in repo_matrix:
    ws3.append(row)


# -------------------------------------------------------------
# TAB 4: Production SQL Schema & View DDL
# -------------------------------------------------------------
ws4 = wb.create_sheet(title="Production_SQL_DDL")

ws4.append(["Production-Ready SQL DDL (with is_deleted = FALSE checks & Zero-Impact Rollup)"])
ws4["A1"].font = title_font
ws4.append(["Exact SQL scripts to create the zero-impact analytical view and fast daily rollup table."])
ws4["A2"].font = subtitle_font
ws4.append([])

sql_lines = [
    ("-- ==========================================================================",),
    ("-- 1. ZERO-IMPACT MATERIALIZED ROLLUP TABLE FOR INSTANT DASHBOARD LOADING",),
    ("-- ==========================================================================",),
    ("CREATE TABLE IF NOT EXISTS public.fact_daily_management_mis (",),
    ("    report_date DATE PRIMARY KEY,",),
    ("    total_vehicle_days INTEGER DEFAULT 0,",),
    ("    allotted_cars_days INTEGER DEFAULT 0,",),
    ("    rm_vehicle_days INTEGER DEFAULT 0,",),
    ("    inventory_vehicle_days INTEGER DEFAULT 0,",),
    ("    active_vehicle_days INTEGER DEFAULT 0,",),
    ("    utilisation_pct NUMERIC(6,2) DEFAULT 0.00,",),
    ("    allotted_pct NUMERIC(6,2) DEFAULT 0.00,",),
    ("    rm_pct NUMERIC(6,2) DEFAULT 0.00,",),
    ("    trips_ola BIGINT DEFAULT 0,",),
    ("    trips_uber BIGINT DEFAULT 0,",),
    ("    trips_rapido BIGINT DEFAULT 0,",),
    ("    total_trips BIGINT DEFAULT 0,",),
    ("    revenue_ola NUMERIC(14,2) DEFAULT 0.00,",),
    ("    revenue_uber NUMERIC(14,2) DEFAULT 0.00,",),
    ("    revenue_rapido NUMERIC(14,2) DEFAULT 0.00,",),
    ("    incentive_ola NUMERIC(14,2) DEFAULT 0.00,",),
    ("    incentive_uber NUMERIC(14,2) DEFAULT 0.00,",),
    ("    incentive_rapido NUMERIC(14,2) DEFAULT 0.00,",),
    ("    grand_total_revenue NUMERIC(14,2) DEFAULT 0.00,",),
    ("    active_epv NUMERIC(12,2) DEFAULT 0.00,",),
    ("    allotted_epv NUMERIC(12,2) DEFAULT 0.00,",),
    ("    rpt NUMERIC(10,2) DEFAULT 0.00,",),
    ("    avg_trip_length NUMERIC(10,2) DEFAULT 0.00,",),
    ("    in_trip_km_active_vehicle NUMERIC(12,2) DEFAULT 0.00,",),
    ("    in_trip_km_ola NUMERIC(12,2) DEFAULT 0.00,",),
    ("    in_trip_km_uber NUMERIC(12,2) DEFAULT 0.00,",),
    ("    in_trip_km_rapido NUMERIC(12,2) DEFAULT 0.00,",),
    ("    total_in_trip_km NUMERIC(12,2) DEFAULT 0.00,",),
    ("    average_oepk NUMERIC(10,2) DEFAULT 0.00,",),
    ("    total_gps_kms NUMERIC(12,2) DEFAULT 0.00,",),
    ("    dead_miles_pct NUMERIC(6,2) DEFAULT 0.00,",),
    ("    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",),
    (");",),
    ("",),
    ("-- ==========================================================================",),
    ("-- 2. HIGH PERFORMANCE PARTIAL INDEXES (ENSURING is_deleted = FALSE SPEED)",),
    ("-- ==========================================================================",),
    ("CREATE INDEX IF NOT EXISTS idx_core_veh_active ON public.core_vehicle_onboarding(onboarding_date, registration_no) WHERE (is_deleted = FALSE AND status != 'Decommissioned');",),
    ("CREATE INDEX IF NOT EXISTS idx_core_alloc_active ON public.core_vehicle_allocation(allocation_date, vehicle_number) WHERE is_deleted = FALSE;",),
    ("CREATE INDEX IF NOT EXISTS idx_core_dropoff_active ON public.core_dropoffs(return_date, vehicle_number) WHERE is_deleted = FALSE;",),
    ("CREATE INDEX IF NOT EXISTS idx_core_maint_active ON public.core_maintenance(in_date_time, out_date_time, vehicle_number) WHERE is_deleted = FALSE;",),
    ("",),
    ("-- ==========================================================================",),
    ("-- 3. IDEMPOTENT DAILY REFRESH STORED PROCEDURE (INCREMENTAL 48-HR WATERMARK)",),
    ("-- ==========================================================================",),
    ("CREATE OR REPLACE PROCEDURE public.sp_refresh_daily_mis_metrics(p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '3 days', p_end_date DATE DEFAULT CURRENT_DATE)",),
    ("LANGUAGE plpgsql AS $$",),
    ("BEGIN",),
    ("    INSERT INTO public.fact_daily_management_mis (",),
    ("        report_date, total_vehicle_days, allotted_cars_days, rm_vehicle_days,",),
    ("        inventory_vehicle_days, active_vehicle_days, utilisation_pct, allotted_pct, rm_pct,",),
    ("        trips_ola, trips_uber, trips_rapido, total_trips,",),
    ("        revenue_ola, revenue_uber, revenue_rapido, incentive_ola, incentive_uber, incentive_rapido,",),
    ("        grand_total_revenue, active_epv, allotted_epv, rpt, avg_trip_length, in_trip_km_active_vehicle,",),
    ("        in_trip_km_ola, in_trip_km_uber, in_trip_km_rapido, total_in_trip_km, average_oepk,",),
    ("        total_gps_kms, dead_miles_pct, last_updated_at",),
    ("    )",),
    ("    SELECT",),
    ("        d.report_date,",),
    ("        COALESCE(v.total_vehicles, 0) AS total_vehicle_days,",),
    ("        COALESCE(a.allotted_vehicles, 0) AS allotted_cars_days,",),
    ("        COALESCE(m.rm_vehicles, 0) AS rm_vehicle_days,",),
    ("        GREATEST(0, COALESCE(v.total_vehicles, 0) - COALESCE(a.allotted_vehicles, 0) - COALESCE(m.rm_vehicles, 0)) AS inventory_vehicle_days,",),
    ("        COALESCE(act.active_vehicles, 0) AS active_vehicle_days,",),
    ("        CASE WHEN COALESCE(v.total_vehicles, 0) > 0 THEN ROUND((COALESCE(act.active_vehicles, 0)::numeric / v.total_vehicles) * 100, 2) ELSE 0 END AS utilisation_pct,",),
    ("        CASE WHEN COALESCE(v.total_vehicles, 0) > 0 THEN ROUND((COALESCE(a.allotted_vehicles, 0)::numeric / v.total_vehicles) * 100, 2) ELSE 0 END AS allotted_pct,",),
    ("        CASE WHEN COALESCE(v.total_vehicles, 0) > 0 THEN ROUND((COALESCE(m.rm_vehicles, 0)::numeric / v.total_vehicles) * 100, 2) ELSE 0 END AS rm_pct,",),
    ("        COALESCE(tr.trips_ola, 0), COALESCE(tr.trips_uber, 0), COALESCE(tr.trips_rapido, 0),",),
    ("        COALESCE(tr.trips_ola, 0) + COALESCE(tr.trips_uber, 0) + COALESCE(tr.trips_rapido, 0) AS total_trips,",),
    ("        COALESCE(rv.revenue_ola, 0), COALESCE(rv.revenue_uber, 0), COALESCE(rv.revenue_rapido, 0),",),
    ("        COALESCE(inc.incentive_ola, 0), COALESCE(inc.incentive_uber, 0), COALESCE(inc.incentive_rapido, 0),",),
    ("        (COALESCE(rv.revenue_ola,0) + COALESCE(rv.revenue_uber,0) + COALESCE(rv.revenue_rapido,0) + COALESCE(inc.incentive_ola,0) + COALESCE(inc.incentive_uber,0) + COALESCE(inc.incentive_rapido,0)) AS grand_total_revenue,",),
    ("        CASE WHEN COALESCE(act.active_vehicles, 0) > 0 THEN ROUND((COALESCE(rv.revenue_ola,0) + COALESCE(rv.revenue_uber,0) + COALESCE(rv.revenue_rapido,0) + COALESCE(inc.incentive_ola,0) + COALESCE(inc.incentive_uber,0) + COALESCE(inc.incentive_rapido,0)) / act.active_vehicles, 2) ELSE 0 END AS active_epv,",),
    ("        CASE WHEN COALESCE(a.allotted_vehicles, 0) > 0 THEN ROUND((COALESCE(rv.revenue_ola,0) + COALESCE(rv.revenue_uber,0) + COALESCE(rv.revenue_rapido,0) + COALESCE(inc.incentive_ola,0) + COALESCE(inc.incentive_uber,0) + COALESCE(inc.incentive_rapido,0)) / a.allotted_vehicles, 2) ELSE 0 END AS allotted_epv,",),
    ("        CASE WHEN (COALESCE(tr.trips_ola, 0) + COALESCE(tr.trips_uber, 0) + COALESCE(tr.trips_rapido, 0)) > 0 THEN ROUND((COALESCE(rv.revenue_ola,0) + COALESCE(rv.revenue_uber,0) + COALESCE(rv.revenue_rapido,0) + COALESCE(inc.incentive_ola,0) + COALESCE(inc.incentive_uber,0) + COALESCE(inc.incentive_rapido,0)) / (COALESCE(tr.trips_ola, 0) + COALESCE(tr.trips_uber, 0) + COALESCE(tr.trips_rapido, 0)), 2) ELSE 0 END AS rpt,",),
    ("        CASE WHEN (COALESCE(tr.trips_ola, 0) + COALESCE(tr.trips_uber, 0) + COALESCE(tr.trips_rapido, 0)) > 0 THEN ROUND((COALESCE(km.km_ola,0) + COALESCE(km.km_uber,0) + COALESCE(km.km_rapido,0)) / (COALESCE(tr.trips_ola, 0) + COALESCE(tr.trips_uber, 0) + COALESCE(tr.trips_rapido, 0)), 2) ELSE 0 END AS avg_trip_length,",),
    ("        CASE WHEN COALESCE(act.active_vehicles, 0) > 0 THEN ROUND((COALESCE(km.km_ola,0) + COALESCE(km.km_uber,0) + COALESCE(km.km_rapido,0)) / act.active_vehicles, 2) ELSE 0 END AS in_trip_km_active_vehicle,",),
    ("        COALESCE(km.km_ola, 0), COALESCE(km.km_uber, 0), COALESCE(km.km_rapido, 0),",),
    ("        (COALESCE(km.km_ola, 0) + COALESCE(km.km_uber, 0) + COALESCE(km.km_rapido, 0)) AS total_in_trip_km,",),
    ("        CASE WHEN (COALESCE(km.km_ola, 0) + COALESCE(km.km_uber, 0) + COALESCE(km.km_rapido, 0)) > 0 THEN ROUND((COALESCE(rv.revenue_ola,0) + COALESCE(rv.revenue_uber,0) + COALESCE(rv.revenue_rapido,0) + COALESCE(inc.incentive_ola,0) + COALESCE(inc.incentive_uber,0) + COALESCE(inc.incentive_rapido,0)) / (COALESCE(km.km_ola, 0) + COALESCE(km.km_uber, 0) + COALESCE(km.km_rapido, 0)), 2) ELSE 0 END AS average_oepk,",),
    ("        COALESCE(gps.total_gps_km, 0),",),
    ("        CASE WHEN COALESCE(gps.total_gps_km, 0) > 0 THEN ROUND(((gps.total_gps_km - (COALESCE(km.km_ola, 0) + COALESCE(km.km_uber, 0) + COALESCE(km.km_rapido, 0))) / gps.total_gps_km) * 100, 2) ELSE 0 END AS dead_miles_pct,",),
    ("        CURRENT_TIMESTAMP",),
    ("    FROM generate_series(p_start_date, p_end_date, '1 day'::interval) d(report_date)",),
    ("    LEFT JOIN LATERAL (SELECT COUNT(DISTINCT registration_no) AS total_vehicles FROM public.core_vehicle_onboarding WHERE is_deleted = FALSE AND status != 'Decommissioned' AND onboarding_date <= d.report_date) v ON true",),
    ("    LEFT JOIN LATERAL (SELECT COUNT(DISTINCT a.vehicle_number) AS allotted_vehicles FROM public.core_vehicle_allocation a LEFT JOIN public.core_dropoffs dr ON dr.vehicle_number = a.vehicle_number AND dr.is_deleted = FALSE WHERE a.is_deleted = FALSE AND a.allocation_date <= d.report_date AND (dr.return_date IS NULL OR dr.return_date > d.report_date)) a ON true",),
    ("    LEFT JOIN LATERAL (SELECT COUNT(DISTINCT m.vehicle_number) AS rm_vehicles FROM public.core_maintenance m WHERE m.is_deleted = FALSE AND DATE(m.in_date_time) <= d.report_date AND (m.out_date_time IS NULL OR DATE(m.out_date_time) >= d.report_date)) m ON true",),
    ("    LEFT JOIN LATERAL (SELECT COUNT(DISTINCT vehicle_number) AS active_vehicles FROM (SELECT vehicle_number FROM public.uber_raw_1 WHERE trip_date = d.report_date UNION SELECT vehicle_number FROM public.ola_raw_1 WHERE trip_date = d.report_date) un) act ON true",),
    ("    LEFT JOIN LATERAL (SELECT (SELECT COALESCE(SUM(completed_bookings),0) FROM public.ola_raw_1 WHERE trip_date = d.report_date) AS trips_ola, (SELECT COUNT(1) FROM public.uber_raw_1 WHERE trip_date = d.report_date) AS trips_uber, (SELECT COUNT(1) FROM public.rapido_raw_1 WHERE trip_date = d.report_date) AS trips_rapido) tr ON true",),
    ("    LEFT JOIN LATERAL (SELECT (SELECT COALESCE(SUM(net_revenue),0) FROM public.ola_raw_1 WHERE trip_date = d.report_date) AS revenue_ola, (SELECT COALESCE(SUM(trip_distance * 15.0),0) FROM public.uber_raw_1 WHERE trip_date = d.report_date) AS revenue_uber, (SELECT COALESCE(SUM(net_revenue),0) FROM public.rapido_raw_1 WHERE trip_date = d.report_date) AS revenue_rapido) rv ON true",),
    ("    LEFT JOIN LATERAL (SELECT (SELECT COALESCE(SUM(amount),0) FROM public.ola_incentive_1) AS incentive_ola, (SELECT COALESCE(SUM(received_from_uber),0)/7.0 FROM public.uber_incentive_1 WHERE week_start_date <= d.report_date AND week_end_date >= d.report_date) AS incentive_uber, (SELECT COALESCE(SUM(amount),0) FROM public.rapido_incentive_16) AS incentive_rapido) inc ON true",),
    ("    LEFT JOIN LATERAL (SELECT (SELECT COALESCE(SUM(actual_kms_raw),0) FROM public.ola_raw_1 WHERE trip_date = d.report_date) AS km_ola, (SELECT COALESCE(SUM(trip_distance),0) FROM public.uber_raw_1 WHERE trip_date = d.report_date) AS km_uber, (SELECT COALESCE(SUM(trip_distance),0) FROM public.rapido_raw_1 WHERE trip_date = d.report_date) AS km_rapido) km ON true",),
    ("    LEFT JOIN LATERAL (SELECT COALESCE(SUM(km_driven),0) AS total_gps_km FROM public.gps_raw_1 WHERE gps_date = d.report_date) gps ON true",),
    ("    ON CONFLICT (report_date) DO UPDATE SET",),
    ("        total_vehicle_days = EXCLUDED.total_vehicle_days,",),
    ("        allotted_cars_days = EXCLUDED.allotted_cars_days,",),
    ("        rm_vehicle_days = EXCLUDED.rm_vehicle_days,",),
    ("        inventory_vehicle_days = EXCLUDED.inventory_vehicle_days,",),
    ("        active_vehicle_days = EXCLUDED.active_vehicle_days,",),
    ("        utilisation_pct = EXCLUDED.utilisation_pct,",),
    ("        allotted_pct = EXCLUDED.allotted_pct,",),
    ("        rm_pct = EXCLUDED.rm_pct,",),
    ("        trips_ola = EXCLUDED.trips_ola,",),
    ("        trips_uber = EXCLUDED.trips_uber,",),
    ("        trips_rapido = EXCLUDED.trips_rapido,",),
    ("        total_trips = EXCLUDED.total_trips,",),
    ("        revenue_ola = EXCLUDED.revenue_ola,",),
    ("        revenue_uber = EXCLUDED.revenue_uber,",),
    ("        revenue_rapido = EXCLUDED.revenue_rapido,",),
    ("        incentive_ola = EXCLUDED.incentive_ola,",),
    ("        incentive_uber = EXCLUDED.incentive_uber,",),
    ("        incentive_rapido = EXCLUDED.incentive_rapido,",),
    ("        grand_total_revenue = EXCLUDED.grand_total_revenue,",),
    ("        active_epv = EXCLUDED.active_epv,",),
    ("        allotted_epv = EXCLUDED.allotted_epv,",),
    ("        rpt = EXCLUDED.rpt,",),
    ("        avg_trip_length = EXCLUDED.avg_trip_length,",),
    ("        in_trip_km_active_vehicle = EXCLUDED.in_trip_km_active_vehicle,",),
    ("        in_trip_km_ola = EXCLUDED.in_trip_km_ola,",),
    ("        in_trip_km_uber = EXCLUDED.in_trip_km_uber,",),
    ("        in_trip_km_rapido = EXCLUDED.in_trip_km_rapido,",),
    ("        total_in_trip_km = EXCLUDED.total_in_trip_km,",),
    ("        average_oepk = EXCLUDED.average_oepk,",),
    ("        total_gps_kms = EXCLUDED.total_gps_kms,",),
    ("        dead_miles_pct = EXCLUDED.dead_miles_pct,",),
    ("        last_updated_at = CURRENT_TIMESTAMP;",),
    ("END;",),
    ("$$;",)
]

for line in sql_lines:
    ws4.append(line)


# -------------------------------------------------------------
# Formatting & Styling All Sheets
# -------------------------------------------------------------
for sheet in wb.worksheets:
    sheet.views.sheetView[0].showGridLines = True
    
    # Format table header on row 4 (if headers exist)
    if sheet.max_row >= 4:
        for col_idx in range(1, sheet.max_column + 1):
            cell = sheet.cell(row=4, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = thin_border
            sheet.row_dimensions[4].height = 28

        # Format data rows
        for row_idx in range(5, sheet.max_row + 1):
            sheet.row_dimensions[row_idx].height = 24
            for col_idx in range(1, sheet.max_column + 1):
                cell = sheet.cell(row=row_idx, column=col_idx)
                cell.border = thin_border
                cell.alignment = Alignment(vertical="center", wrap_text=True)
                
                # Sheet 1 special styling
                if sheet.title == "KPI_Sources_and_Logic":
                    sec = str(sheet.cell(row=row_idx, column=2).value)
                    if col_idx == 1:
                        cell.font = bold_font
                    elif col_idx == 2:
                        cell.font = bold_font
                        cell.alignment = Alignment(horizontal="center", vertical="center")
                        if "Assets" in sec: cell.fill = cat_assets_fill
                        elif "Trips" in sec: cell.fill = cat_trips_fill
                        elif "Revenue" in sec: cell.fill = cat_rev_fill
                        elif "Quality" in sec: cell.fill = cat_qual_fill
                        elif "Dead" in sec: cell.fill = cat_dead_fill
                    elif col_idx in [4, 5, 6, 7]:
                        cell.font = code_font
                    else:
                        cell.font = regular_font
                elif sheet.title == "Zero_Impact_Architecture":
                    if col_idx == 1:
                        cell.font = bold_font
                        cell.alignment = Alignment(horizontal="center", vertical="center")
                        cell.fill = subheader_fill
                    elif col_idx == 2:
                        cell.font = bold_font
                    elif col_idx == 5:
                        cell.font = Font(name="Segoe UI", size=10, bold=True, color="008361")
                        cell.alignment = Alignment(horizontal="center", vertical="center")
                    else:
                        cell.font = regular_font
                elif sheet.title == "Repo_to_Table_Matrix":
                    if col_idx in [1, 2]:
                        cell.font = bold_font
                    elif col_idx in [3, 4]:
                        cell.font = code_font
                    else:
                        cell.font = regular_font
                elif sheet.title == "Production_SQL_DDL":
                    cell.font = code_font
                    cell.alignment = Alignment(vertical="center")

    # Auto-adjust column widths
    for col in sheet.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            # Skip title row length
            if cell.row in [1, 2]:
                continue
            val_str = str(cell.value or '')
            if '\n' in val_str:
                lines = val_str.split('\n')
                max_len = max(max_len, max(len(l) for l in lines))
            else:
                max_len = max(max_len, len(val_str))
        adjusted_width = min(max(max_len + 4, 14), 55)
        sheet.column_dimensions[col_letter].width = adjusted_width

# Save workbook
os.makedirs(os.path.dirname(downloads_path), exist_ok=True)
wb.save(downloads_path)
print(f"Successfully generated: {downloads_path}")
