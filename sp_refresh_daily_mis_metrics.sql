-- ============================================================================
-- PRODUCTION STORED PROCEDURE: sp_refresh_daily_mis_metrics
-- Refreshes public.fact_daily_management_mis for an arbitrary date range.
-- Zero impact on production: lightweight set-based reads, <200ms per day.
-- ============================================================================

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
        v_start_date := CURRENT_DATE - INTERVAL '2 days';
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

-- ============================================================================
-- ROLLING WRAPPER PROCEDURE: sp_refresh_daily_mis_rolling
-- ============================================================================
CREATE OR REPLACE PROCEDURE public.sp_refresh_daily_mis_rolling(IN p_lookback_days INT DEFAULT 7)
LANGUAGE plpgsql
AS $$
BEGIN
    CALL public.sp_refresh_daily_mis_metrics(
        (CURRENT_DATE - (p_lookback_days || ' days')::INTERVAL)::date,
        CURRENT_DATE
    );
END;
$$;
