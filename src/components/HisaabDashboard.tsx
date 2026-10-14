import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Search, Download, Filter, MapPin, Calendar, 
  ChevronDown, ChevronLeft, ChevronRight, X, ExternalLink, 
  IndianRupee, Users, Truck, FileSpreadsheet, RefreshCw, 
  AlertCircle, CheckCircle2, Info, Layers
} from 'lucide-react';
import { User } from '../types';

interface HisaabDashboardProps {
  user?: User | null;
  onBackToSelector?: () => void;
  onBack?: () => void;
  onLogout?: () => void;
}

type HisaabFormat = 'vehicle_weekly' | 'consolidated_partner' | 'daily_ledger';

interface SettlementWeek {
  week_id: string;
  settlement_year: number;
  settlement_week: number;
  week_start: string;
  week_end: string;
  is_locked: boolean;
}

interface HisaabSummary {
  total_records: number;
  total_drivers: number;
  total_vehicles: number;
  total_allotted_days: number;
  total_onroad_days: number;
  total_lease_rental: number;
  total_trips: number;
  total_gross_earnings: number;
  total_cash_collected: number;
  total_incentives: number;
  total_deductions: number;
  total_payout_to_drivers: number;
  total_to_collect: number;
  total_uber_trips: number;
  total_uber_earnings: number;
  total_ola_trips: number;
  total_ola_revenue: number;
}

export default function HisaabDashboard({ user, onBackToSelector, onBack, onLogout }: HisaabDashboardProps) {
  const handleBack = onBack || onBackToSelector;

  // View Format: Partner+Vehicle (Weekly), Consolidated Partner, Daily Ledger
  const [activeFormat, setActiveFormat] = useState<HisaabFormat>('vehicle_weekly');

  // Filters
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [availableCities, setAvailableCities] = useState<string[]>(['All Cities', 'Bengaluru', 'Mumbai', 'Hyderabad', 'Delhi']);
  const [weeks, setWeeks] = useState<SettlementWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Data & Loading States
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<HisaabSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Drawer / Modal for Driver Hisaab detail
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // 1. Fetch operating cities & settlement weeks on mount
  useEffect(() => {
    fetch('/api/cities')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const names = Array.from(new Set(data.map((c: any) => c.text || c.name || c.value)));
          setAvailableCities(['All Cities', ...names]);
        }
      })
      .catch(() => {});

    fetch('/api/hisaab/weeks')
      .then(res => res.ok ? res.json() : { data: [] })
      .then(res => {
        const weeksData = res.data || [];
        setWeeks(weeksData);
        // Default to latest week if available
        if (weeksData.length > 0) {
          setSelectedWeek(weeksData[0].week_id);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Fetch Hisaab Summary KPIs
  const fetchSummary = () => {
    const params = new URLSearchParams();
    if (selectedCity && selectedCity !== 'All Cities') params.append('city', selectedCity);
    if (selectedWeek && selectedWeek !== 'All') params.append('week_id', selectedWeek);
    params.append('format', activeFormat);

    fetch(`/api/hisaab/summary?${params.toString()}`)
      .then(res => res.ok ? res.json() : { summary: null })
      .then(res => {
        if (res.summary) setSummary(res.summary);
      })
      .catch(err => console.error('Summary fetch error:', err));
  };

  // 3. Fetch Hisaab Records
  const fetchRecords = () => {
    setIsLoading(true);
    setErrorMsg(null);

    const params = new URLSearchParams();
    params.append('format', activeFormat);
    if (selectedCity && selectedCity !== 'All Cities') params.append('city', selectedCity);
    if (selectedWeek && selectedWeek !== 'All') params.append('week_id', selectedWeek);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    if (statusFilter && statusFilter !== 'All') params.append('status', statusFilter);
    params.append('page', page.toString());
    params.append('limit', pageSize.toString());

    fetch(`/api/hisaab/records?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(res => {
        setRecords(res.data || []);
        setTotalCount(res.total_count || 0);
        setTotalPages(res.total_pages || 1);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Records fetch error:', err);
        setErrorMsg('Failed to load Hisaab records. Please check database connection.');
        setIsLoading(false);
      });
  };

  // Trigger data reload on filter change
  useEffect(() => {
    fetchSummary();
  }, [selectedCity, selectedWeek, activeFormat]);

  useEffect(() => {
    fetchRecords();
  }, [selectedCity, selectedWeek, activeFormat, searchQuery, statusFilter, page, pageSize]);

  // Reset page when format or filters change
  const handleFormatChange = (fmt: HisaabFormat) => {
    setActiveFormat(fmt);
    setPage(1);
    setSelectedRecord(null);
  };

  const handleCityChange = (c: string) => {
    setSelectedCity(c);
    setPage(1);
  };

  const handleWeekChange = (w: string) => {
    setSelectedWeek(w);
    setPage(1);
  };

  // CSV Export
  const handleExportCSV = () => {
    setIsDownloading(true);
    const params = new URLSearchParams();
    params.append('format', activeFormat);
    if (selectedCity && selectedCity !== 'All Cities') params.append('city', selectedCity);
    if (selectedWeek && selectedWeek !== 'All') params.append('week_id', selectedWeek);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    if (statusFilter && statusFilter !== 'All') params.append('status', statusFilter);

    const exportUrl = `/api/hisaab/export?${params.toString()}`;
    window.location.href = exportUrl;
    setTimeout(() => setIsDownloading(false), 2000);
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatNumber = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '0';
    return new Intl.NumberFormat('en-IN').format(val);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      
      {/* ────────────────────────────────────────────────────────── */}
      {/* Top Header Bar */}
      {/* ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: Back & Title */}
          <div className="flex items-center gap-3">
            {handleBack && (
              <button
                onClick={handleBack}
                type="button"
                className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                title="Back to Selector"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                <IndianRupee className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  Driver Hisaab Dashboard
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  Partner + Vehicle Settlements & Weekly Accounts Matrix
                </p>
              </div>
            </div>
          </div>

          {/* Center: Format Switcher Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleFormatChange('vehicle_weekly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFormat === 'vehicle_weekly'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              <span>Partner + Vehicle (Weekly)</span>
            </button>
            <button
              type="button"
              onClick={() => handleFormatChange('consolidated_partner')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFormat === 'consolidated_partner'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Consolidated Partner</span>
            </button>
            <button
              type="button"
              onClick={() => handleFormatChange('daily_ledger')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFormat === 'daily_ledger'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Daily Ledger</span>
            </button>
          </div>

          {/* Right: City, Week & Download Options */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* City Dropdown */}
            <div className="relative">
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer shadow-2xs pr-8"
              >
                {availableCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <MapPin className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            {/* Week Dropdown */}
            <div className="relative">
              <select
                value={selectedWeek}
                onChange={(e) => handleWeekChange(e.target.value)}
                className="bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer shadow-2xs pr-8"
              >
                <option value="All">All Settlement Weeks</option>
                {weeks.map(w => (
                  <option key={w.week_id} value={w.week_id}>
                    {w.week_id} ({w.week_start} to {w.week_end})
                  </option>
                ))}
              </select>
              <Calendar className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isDownloading || records.length === 0}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-3.5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isDownloading ? 'Exporting...' : 'Export CSV'}</span>
            </button>

          </div>

        </div>
      </header>

      {/* ────────────────────────────────────────────────────────── */}
      {/* Main Container */}
      {/* ────────────────────────────────────────────────────────── */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        
        {/* ────────────────────────────────────────────────────────── */}
        {/* Executive Summary KPI Cards */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Fleet & Partners */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Fleet & Partners</span>
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">
                {formatNumber(summary?.total_vehicles)}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Vehicles</span>
              <span className="text-slate-300">/</span>
              <span className="text-2xl font-extrabold text-slate-900">
                {formatNumber(summary?.total_drivers)}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Drivers</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
              <span>On-Road Days: <strong>{formatNumber(summary?.total_onroad_days)}</strong></span>
              <span>Allotted: <strong>{formatNumber(summary?.total_allotted_days)}</strong></span>
            </div>
          </div>

          {/* Card 2: Platform Earnings */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Platform Earnings</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-emerald-700">
                {formatCurrency(summary?.total_gross_earnings)}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Across <strong>{formatNumber(summary?.total_trips)}</strong> completed trips
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
              <span>Uber: <strong>{formatCurrency(summary?.total_uber_earnings)}</strong></span>
              <span>Ola: <strong>{formatCurrency(summary?.total_ola_revenue)}</strong></span>
            </div>
          </div>

          {/* Card 3: Lease Rent & Cash Collected */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Rent & Driver Cash</span>
              <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatCurrency(summary?.total_lease_rental)}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Total Net Lease Rental Billed
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
              <span>Cash with Driver: <strong>{formatCurrency(summary?.total_cash_collected)}</strong></span>
              <span>Deductions: <strong>{formatCurrency(summary?.total_deductions)}</strong></span>
            </div>
          </div>

          {/* Card 4: Net Settlement Outcome */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Settlement Position</span>
              <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Info className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-emerald-600 uppercase">Payouts to Drivers</div>
                <div className="text-lg font-black text-emerald-700">
                  {formatCurrency(summary?.total_payout_to_drivers)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-rose-600 uppercase">To Collect / Due</div>
                <div className="text-lg font-black text-rose-700">
                  {formatCurrency(summary?.total_to_collect)}
                </div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Incentives: <strong>{formatCurrency(summary?.total_incentives)}</strong></span>
              <span>Records: <strong>{formatNumber(summary?.total_records)}</strong></span>
            </div>
          </div>

        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* Search & Filter Toolbar */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={
                  activeFormat === 'consolidated_partner'
                    ? "Search partner name or ID..."
                    : "Search driver name, partner ID, or car plate (e.g. KA51AL9582)..."
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="CALCULATED">Calculated</option>
              <option value="FROZEN">Frozen</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          {/* Records & Pagination Overview */}
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span>
              Showing <strong>{records.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> - <strong>{Math.min(page * pageSize, totalCount)}</strong> of <strong>{formatNumber(totalCount)}</strong>
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>

        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* Main Data Table */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-left text-xs border-collapse">
              
              {/* Table Group Header */}
              <thead className="bg-slate-50 sticky top-0 z-20 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[10px]">
                {activeFormat === 'vehicle_weekly' && (
                  <tr>
                    <th colSpan={4} className="px-3 py-2 bg-slate-100 border-r border-slate-200 text-slate-800">
                      Partner & Vehicle Entity
                    </th>
                    <th colSpan={3} className="px-3 py-2 bg-blue-50/70 border-r border-slate-200 text-blue-900">
                      Operations & Lease Rent
                    </th>
                    <th colSpan={3} className="px-3 py-2 bg-emerald-50/70 border-r border-slate-200 text-emerald-900">
                      Uber Performance
                    </th>
                    <th colSpan={3} className="px-3 py-2 bg-amber-50/70 border-r border-slate-200 text-amber-900">
                      Ola Performance
                    </th>
                    <th colSpan={2} className="px-3 py-2 bg-rose-50/70 border-r border-slate-200 text-rose-900">
                      Penalties & Deductions
                    </th>
                    <th colSpan={3} className="px-3 py-2 bg-purple-50/70 text-purple-900">
                      Net Settlement Position
                    </th>
                  </tr>
                )}
                
                {/* Column Headers */}
                <tr className="bg-slate-100/80 border-b border-slate-200">
                  {activeFormat === 'vehicle_weekly' && (
                    <>
                      <th className="px-3 py-2.5 font-bold">Partner / Driver</th>
                      <th className="px-3 py-2.5 font-bold">Vehicle</th>
                      <th className="px-3 py-2.5 font-bold">City</th>
                      <th className="px-3 py-2.5 font-bold border-r border-slate-200">Week</th>
                      <th className="px-3 py-2.5 font-bold text-center">Days (On/Allot)</th>
                      <th className="px-3 py-2.5 font-bold text-right">Daily Rent</th>
                      <th className="px-3 py-2.5 font-bold text-right border-r border-slate-200">Net Lease Rental</th>
                      <th className="px-3 py-2.5 font-bold text-center">Trips</th>
                      <th className="px-3 py-2.5 font-bold text-right">Earnings</th>
                      <th className="px-3 py-2.5 font-bold text-right border-r border-slate-200">Cash</th>
                      <th className="px-3 py-2.5 font-bold text-center">Trips</th>
                      <th className="px-3 py-2.5 font-bold text-right">Revenue</th>
                      <th className="px-3 py-2.5 font-bold text-right border-r border-slate-200">Cash</th>
                      <th className="px-3 py-2.5 font-bold text-right">Challan / Acc</th>
                      <th className="px-3 py-2.5 font-bold text-right border-r border-slate-200">Dead Mile</th>
                      <th className="px-3 py-2.5 font-bold text-right">To Pay (Driver)</th>
                      <th className="px-3 py-2.5 font-bold text-right">To Collect</th>
                      <th className="px-3 py-2.5 font-bold text-center">Status</th>
                    </>
                  )}

                  {activeFormat === 'consolidated_partner' && (
                    <>
                      <th className="px-3 py-2.5 font-bold">Partner Name</th>
                      <th className="px-3 py-2.5 font-bold">Partner ID</th>
                      <th className="px-3 py-2.5 font-bold">City</th>
                      <th className="px-3 py-2.5 font-bold">Week</th>
                      <th className="px-3 py-2.5 font-bold text-center">Cars</th>
                      <th className="px-3 py-2.5 font-bold text-center">On-Road Days</th>
                      <th className="px-3 py-2.5 font-bold text-center">Total Trips</th>
                      <th className="px-3 py-2.5 font-bold text-right">Rent Billed</th>
                      <th className="px-3 py-2.5 font-bold text-right">Platform Earnings</th>
                      <th className="px-3 py-2.5 font-bold text-right">Cash Collected</th>
                      <th className="px-3 py-2.5 font-bold text-right">Total Deductions</th>
                      <th className="px-3 py-2.5 font-bold text-right">Net Payout</th>
                      <th className="px-3 py-2.5 font-bold text-right">Net To Collect</th>
                      <th className="px-3 py-2.5 font-bold text-center">Status</th>
                    </>
                  )}

                  {activeFormat === 'daily_ledger' && (
                    <>
                      <th className="px-3 py-2.5 font-bold">Date</th>
                      <th className="px-3 py-2.5 font-bold">Partner ID</th>
                      <th className="px-3 py-2.5 font-bold">Vehicle</th>
                      <th className="px-3 py-2.5 font-bold">City</th>
                      <th className="px-3 py-2.5 font-bold text-right">Daily Rent</th>
                      <th className="px-3 py-2.5 font-bold text-center">Total Trips</th>
                      <th className="px-3 py-2.5 font-bold text-right">Gross Fares</th>
                      <th className="px-3 py-2.5 font-bold text-right">Cash Collected</th>
                      <th className="px-3 py-2.5 font-bold text-right">Incentives</th>
                      <th className="px-3 py-2.5 font-bold text-right">Deductions</th>
                      <th className="px-3 py-2.5 font-bold text-right">Daily Balance</th>
                    </>
                  )}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={18} className="px-4 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                        <span className="text-xs font-semibold">Loading Hisaab settlement matrix...</span>
                      </div>
                    </td>
                  </tr>
                ) : errorMsg ? (
                  <tr>
                    <td colSpan={18} className="px-4 py-12 text-center text-rose-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="h-6 w-6" />
                        <span className="text-xs font-semibold">{errorMsg}</span>
                      </div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="px-4 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Info className="h-6 w-6 text-slate-300" />
                        <span className="text-xs font-semibold">No Hisaab records found matching the active filters.</span>
                        <span className="text-[11px] text-slate-400">Try selecting "All Cities" or a different settlement week.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((r, idx) => (
                    <tr
                      key={r.id || r.hisaab_id || r.partner_hisaab_id || r.ledger_id || idx}
                      onClick={() => setSelectedRecord(r)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {activeFormat === 'vehicle_weekly' && (
                        <>
                          {/* Partner / Driver */}
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {r.partner_name || 'Unnamed Driver'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {r.partner_id || '-'}
                            </div>
                          </td>

                          {/* Vehicle */}
                          <td className="px-3 py-2.5">
                            <div className="font-bold font-mono text-slate-900">
                              {r.vehicle_number}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {r.vehicle_model || '-'}
                            </div>
                          </td>

                          {/* City */}
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                              {r.normalized_city || r.city}
                            </span>
                          </td>

                          {/* Week */}
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600 border-r border-slate-200">
                            {r.week_id}
                          </td>

                          {/* Days */}
                          <td className="px-3 py-2.5 text-center">
                            <span className="font-bold text-slate-900">{r.onroad_days}</span>
                            <span className="text-slate-400"> / {r.allotted_days}</span>
                          </td>

                          {/* Daily Rent */}
                          <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                            ₹{r.daily_rent_applied}
                          </td>

                          {/* Net Lease Rental */}
                          <td className="px-3 py-2.5 text-right font-bold font-mono text-slate-900 border-r border-slate-200">
                            {formatCurrency(r.net_weekly_lease_rental)}
                          </td>

                          {/* Uber Trips */}
                          <td className="px-3 py-2.5 text-center font-bold text-slate-700">
                            {r.uber_trips}
                          </td>

                          {/* Uber Earnings */}
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                            {formatCurrency(r.uber_total_earnings)}
                          </td>

                          {/* Uber Cash */}
                          <td className="px-3 py-2.5 text-right font-mono text-amber-700 border-r border-slate-200">
                            {formatCurrency(r.uber_cash_collection)}
                          </td>

                          {/* Ola Trips */}
                          <td className="px-3 py-2.5 text-center font-bold text-slate-700">
                            {r.ola_trips}
                          </td>

                          {/* Ola Revenue */}
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                            {formatCurrency(r.ola_net_revenue)}
                          </td>

                          {/* Ola Cash */}
                          <td className="px-3 py-2.5 text-right font-mono text-amber-700 border-r border-slate-200">
                            {formatCurrency(r.ola_cash_collection)}
                          </td>

                          {/* Challan / Accident */}
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                            {formatCurrency((Number(r.challan_amount) || 0) + (Number(r.accident_deduction) || 0))}
                          </td>

                          {/* Dead Mile Penalty */}
                          <td className="px-3 py-2.5 text-right font-mono text-rose-600 border-r border-slate-200">
                            {formatCurrency(r.gps_dead_mile_penalty)}
                          </td>

                          {/* Net Payout (Driver) */}
                          <td className="px-3 py-2.5 text-right font-bold font-mono">
                            {Number(r.net_payout_to_driver) > 0 ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {formatCurrency(r.net_payout_to_driver)}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* Net To Collect (Driver owes) */}
                          <td className="px-3 py-2.5 text-right font-bold font-mono">
                            {Number(r.net_to_collect_from_driver) > 0 ? (
                              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                                {formatCurrency(r.net_to_collect_from_driver)}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-3 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              r.settlement_status === 'FROZEN'
                                ? 'bg-indigo-100 text-indigo-700'
                                : r.settlement_status === 'CALCULATED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {r.settlement_status}
                            </span>
                          </td>
                        </>
                      )}

                      {activeFormat === 'consolidated_partner' && (
                        <>
                          <td className="px-3 py-2.5 font-bold text-slate-900">{r.partner_name}</td>
                          <td className="px-3 py-2.5 font-mono text-slate-500">{r.partner_id}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                              {r.normalized_city || r.city}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-600">{r.week_id}</td>
                          <td className="px-3 py-2.5 text-center font-bold">{r.allotted_cars_count}</td>
                          <td className="px-3 py-2.5 text-center">{r.total_onroad_days}</td>
                          <td className="px-3 py-2.5 text-center font-bold">{r.total_trips}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(r.total_net_rent_billed)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-emerald-700 font-bold">{formatCurrency(r.total_platform_earnings)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-amber-700">{formatCurrency(r.total_cash_collected)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                            {formatCurrency(
                              (Number(r.total_adjustments) || 0) + 
                              (Number(r.total_challans) || 0) + 
                              (Number(r.total_accidents) || 0) + 
                              (Number(r.total_dead_mile_penalty) || 0)
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                            {Number(r.net_bank_payout) > 0 ? formatCurrency(r.net_bank_payout) : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-700">
                            {Number(r.net_amount_to_collect) > 0 ? formatCurrency(r.net_amount_to_collect) : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {r.settlement_status}
                            </span>
                          </td>
                        </>
                      )}

                      {activeFormat === 'daily_ledger' && (
                        <>
                          <td className="px-3 py-2.5 font-bold font-mono text-slate-900">{r.log_date}</td>
                          <td className="px-3 py-2.5 font-mono text-slate-500">{r.partner_id}</td>
                          <td className="px-3 py-2.5 font-bold font-mono text-slate-900">{r.vehicle_number}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                              {r.normalized_city || r.city}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(r.net_daily_rent)}</td>
                          <td className="px-3 py-2.5 text-center font-bold">{r.total_trips}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-emerald-700 font-bold">{formatCurrency(r.total_fare_earnings)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-amber-700">{formatCurrency(r.total_cash_collected)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-600">{formatCurrency(r.total_incentives)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-rose-600">{formatCurrency(r.total_deductions)}</td>
                          <td className="px-3 py-2.5 text-right font-bold font-mono">
                            {formatCurrency(r.daily_net_balance)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination Controls */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs text-slate-600">
            <div>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> (Total <strong>{formatNumber(totalCount)}</strong> items)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <span className="px-2 font-bold text-slate-900">{page}</span>

              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

        </section>

      </main>

      {/* ────────────────────────────────────────────────────────── */}
      {/* Driver Detail Drawer / Breakdown Modal */}
      {/* ────────────────────────────────────────────────────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                  Settlement Breakdown Sheet
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {selectedRecord.partner_name || selectedRecord.partner_id}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Vehicle: <strong>{selectedRecord.vehicle_number || '-'}</strong> ({selectedRecord.vehicle_model || '-'}) | Week: <strong>{selectedRecord.week_id}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="h-8 w-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 text-xs text-slate-700">
              
              {/* Formula Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Settlement Accounting Formula
                </div>
                <div className="font-mono text-xs text-slate-800 leading-relaxed">
                  Net Due = (Lease Rent + Driver Cash + Deductions) - (Platform Earnings + Incentives)
                </div>
              </div>

              {/* Two-Column Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Debits / Dues */}
                <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 space-y-2.5">
                  <div className="text-xs font-bold text-rose-900 border-b border-rose-200/60 pb-1 flex items-center justify-between">
                    <span>Company Dues (+)</span>
                    <span>Debit</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weekly Lease Rental:</span>
                    <strong className="font-mono">{formatCurrency(selectedRecord.net_weekly_lease_rental || selectedRecord.total_net_rent_billed || selectedRecord.net_daily_rent)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Uber Cash Collected:</span>
                    <strong className="font-mono">{formatCurrency(selectedRecord.uber_cash_collection || selectedRecord.total_cash_collected)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ola Cash Collected:</span>
                    <strong className="font-mono">{formatCurrency(selectedRecord.ola_cash_collection || 0)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Challan Penalties:</span>
                    <strong className="font-mono">{formatCurrency(selectedRecord.challan_amount || selectedRecord.total_challans || 0)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Dead Mile Penalty:</span>
                    <strong className="font-mono">{formatCurrency(selectedRecord.gps_dead_mile_penalty || selectedRecord.total_dead_mile_penalty || 0)}</strong>
                  </div>
                </div>

                {/* Credits / Earnings */}
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-2.5">
                  <div className="text-xs font-bold text-emerald-900 border-b border-emerald-200/60 pb-1 flex items-center justify-between">
                    <span>Driver Earnings & Credits (-)</span>
                    <span>Credit</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uber Gross Fare:</span>
                    <strong className="font-mono text-emerald-800">{formatCurrency(selectedRecord.uber_total_earnings || selectedRecord.total_platform_earnings)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ola Gross Revenue:</span>
                    <strong className="font-mono text-emerald-800">{formatCurrency(selectedRecord.ola_net_revenue || 0)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Uber Incentive:</span>
                    <strong className="font-mono text-emerald-800">{formatCurrency(selectedRecord.uber_incentive || 0)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ola Incentive:</span>
                    <strong className="font-mono text-emerald-800">{formatCurrency(selectedRecord.ola_incentive || selectedRecord.total_platform_incentives || 0)}</strong>
                  </div>
                </div>

              </div>

              {/* Final Settlement Position Box */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Net Settlement Result</div>
                  <div className="text-sm font-semibold text-slate-200 mt-0.5">
                    {Number(selectedRecord.net_payout_to_driver || selectedRecord.net_bank_payout) > 0 ? (
                      <span className="text-emerald-400">Company pays Driver</span>
                    ) : (
                      <span className="text-rose-400">Driver owes Company</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black font-mono">
                    {Number(selectedRecord.net_payout_to_driver || selectedRecord.net_bank_payout) > 0
                      ? formatCurrency(selectedRecord.net_payout_to_driver || selectedRecord.net_bank_payout)
                      : formatCurrency(selectedRecord.net_to_collect_from_driver || selectedRecord.net_amount_to_collect)}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end rounded-b-3xl">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Close Sheet
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
