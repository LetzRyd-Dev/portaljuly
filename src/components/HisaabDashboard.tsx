import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, Search, Download, MapPin, Calendar, 
  ChevronLeft, ChevronRight, X, IndianRupee, Users, 
  Truck, FileSpreadsheet, RefreshCw, AlertCircle, 
  Info, Layers, Building2, ChevronDown, Check, FileText
} from 'lucide-react';
import { User } from '../types';

interface HisaabDashboardProps {
  user?: User | null;
  onBackToSelector?: () => void;
  onBack?: () => void;
  onLogout?: () => void;
}

type HisaabFormat = 'vehicle_weekly' | 'consolidated_partner' | 'daily_ledger' | 'city_summary';
type ExportScope = 'master' | 'filtered' | 'city' | 'csv';

interface SettlementWeek {
  week_id: string;
  settlement_year: number;
  settlement_week: number;
  week_start: string;
  week_end: string;
  is_locked: boolean;
}

interface CitySummaryRow {
  city: string;
  total_allocations: number;
  real_partner_rows: number;
  onroad_days: number;
  uber_earnings: number;
  ola_revenue: number;
  gross_revenue: number;
  net_lease_rental: number;
  challans: number;
  tds: number;
  deadmile_penalty: number;
  current_week_os: number;
  driver_net_payout: number;
  driver_net_to_collect: number;
}

export default function HisaabDashboard({ user, onBackToSelector, onBack, onLogout }: HisaabDashboardProps) {
  const handleBack = onBack || onBackToSelector;

  // 1. View Format Tabs
  const [activeFormat, setActiveFormat] = useState<HisaabFormat>('vehicle_weekly');

  // 2. Filter States
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [availableCities, setAvailableCities] = useState<string[]>([
    'All Cities', 'Bangalore', 'Hyderabad', 'Mumbai', 'Delhi'
  ]);
  const [weeks, setWeeks] = useState<SettlementWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. Pagination States
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // 4. Data & Loading States
  const [records, setRecords] = useState<any[]>([]);
  const [citySummaries, setCitySummaries] = useState<CitySummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 5. Export Dropdown Menu State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // 6. Drawer / Modal for Driver Hisaab detail breakdown
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch operating cities & settlement calendar weeks on mount
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
        if (weeksData.length > 0) {
          setSelectedWeek(weeksData[0].week_id);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Records / City Summary on filter change
  useEffect(() => {
    if (activeFormat === 'city_summary') {
      fetchCitySummary();
    } else {
      fetchRecords();
    }
  }, [selectedCity, selectedWeek, activeFormat, searchQuery, page, pageSize]);

  const fetchCitySummary = () => {
    setIsLoading(true);
    setErrorMsg(null);
    const params = new URLSearchParams();
    if (selectedCity && selectedCity !== 'All Cities') params.append('city', selectedCity);
    if (selectedWeek && selectedWeek !== 'All') params.append('week_id', selectedWeek);

    fetch(`/api/hisaab/summary?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(res => {
        setCitySummaries(res.city_summaries || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Summary fetch error:', err);
        setErrorMsg('Failed to load City Summary data.');
        setIsLoading(false);
      });
  };

  const fetchRecords = () => {
    setIsLoading(true);
    setErrorMsg(null);

    const params = new URLSearchParams();
    params.append('format', activeFormat);
    if (selectedCity && selectedCity !== 'All Cities') params.append('city', selectedCity);
    if (selectedWeek && selectedWeek !== 'All') params.append('week_id', selectedWeek);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
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
        setErrorMsg('Failed to load Hisaab records. Please verify database connection.');
        setIsLoading(false);
      });
  };

  // Format Switcher Handlers
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

  // Flexible Export Handler
  const handleExport = (scope: ExportScope) => {
    setIsDownloading(true);
    setIsExportMenuOpen(false);

    const params = new URLSearchParams();
    params.append('scope', scope);
    params.append('format', activeFormat === 'city_summary' ? 'vehicle_weekly' : activeFormat);
    if (scope === 'csv') {
      params.append('file_type', 'csv');
    } else {
      params.append('file_type', 'xlsx');
    }
    if (selectedCity && selectedCity !== 'All Cities') params.append('city', selectedCity);
    if (selectedWeek && selectedWeek !== 'All') params.append('week_id', selectedWeek);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());

    const exportUrl = `/api/hisaab/export?${params.toString()}`;
    window.location.href = exportUrl;
    setTimeout(() => setIsDownloading(false), 2500);
  };

  // Modern Financial Cell Formatter for Dashboard
  const renderMoney = (val: number | string | null | undefined, options?: { highlightZero?: boolean; isCredit?: boolean; isDebit?: boolean }) => {
    const num = Number(val);
    if (val === null || val === undefined || isNaN(num) || num === 0) {
      return <span className="text-slate-300 font-mono text-[11px]">-</span>;
    }
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);

    if (options?.isCredit) {
      return <span className="text-emerald-700 font-mono font-semibold">{formatted}</span>;
    }
    if (options?.isDebit) {
      return <span className="text-rose-700 font-mono font-semibold">{formatted}</span>;
    }
    return <span className="text-slate-800 font-mono font-semibold">{formatted}</span>;
  };

  const renderCount = (val: number | string | null | undefined) => {
    const num = Number(val);
    if (val === null || val === undefined || isNaN(num) || num === 0) {
      return <span className="text-slate-300 font-mono text-[11px]">0</span>;
    }
    return <span className="text-slate-800 font-bold font-mono">{num}</span>;
  };

  const formatCurrency = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === '') return '₹0';
    const num = Number(val);
    if (isNaN(num)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatNumber = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === '') return '0';
    const num = Number(val);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const formatVal = (val: any) => {
    if (val === null || val === undefined || val === '') return '-';
    return val;
  };

  // City Summary Totals
  const summaryTotals = useMemo(() => {
    return citySummaries.reduce(
      (acc, row) => ({
        total_allocations: acc.total_allocations + (Number(row.total_allocations) || 0),
        real_partner_rows: acc.real_partner_rows + (Number(row.real_partner_rows) || 0),
        onroad_days: acc.onroad_days + (Number(row.onroad_days) || 0),
        uber_earnings: acc.uber_earnings + (Number(row.uber_earnings) || 0),
        ola_revenue: acc.ola_revenue + (Number(row.ola_revenue) || 0),
        gross_revenue: acc.gross_revenue + (Number(row.gross_revenue) || 0),
        net_lease_rental: acc.net_lease_rental + (Number(row.net_lease_rental) || 0),
        challans: acc.challans + (Number(row.challans) || 0),
        tds: acc.tds + (Number(row.tds) || 0),
        deadmile_penalty: acc.deadmile_penalty + (Number(row.deadmile_penalty) || 0),
        current_week_os: acc.current_week_os + (Number(row.current_week_os) || 0),
        driver_net_payout: acc.driver_net_payout + (Number(row.driver_net_payout) || 0),
        driver_net_to_collect: acc.driver_net_to_collect + (Number(row.driver_net_to_collect) || 0),
      }),
      {
        total_allocations: 0,
        real_partner_rows: 0,
        onroad_days: 0,
        uber_earnings: 0,
        ola_revenue: 0,
        gross_revenue: 0,
        net_lease_rental: 0,
        challans: 0,
        tds: 0,
        deadmile_penalty: 0,
        current_week_os: 0,
        driver_net_payout: 0,
        driver_net_to_collect: 0,
      }
    );
  }, [citySummaries]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      
      {/* ────────────────────────────────────────────────────────── */}
      {/* Top Header Bar */}
      {/* ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: Back Arrow & Dashboard Title */}
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
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                  Driver Hisaab Dashboard
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  Partner + Vehicle Weekly Settlements & Accounts Matrix
                </p>
              </div>
            </div>
          </div>

          {/* Center: Format Navigation Tabs (Accessible & Symmetrically Placed) */}
          <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleFormatChange('vehicle_weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFormat === 'vehicle_weekly'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              <span>Partner + Vehicle</span>
            </button>
            <button
              type="button"
              onClick={() => handleFormatChange('consolidated_partner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFormat === 'daily_ledger'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Daily Ledger</span>
            </button>
            <button
              type="button"
              onClick={() => handleFormatChange('city_summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFormat === 'city_summary'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>City Summary</span>
            </button>
          </nav>

        </div>
      </header>

      {/* ────────────────────────────────────────────────────────── */}
      {/* Unified Filter Toolbar (All Filters Kept in ONE Place) */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 shadow-2xs">
        <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Combined Filters Group (City + Week + Search) */}
          <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-[320px]">
            
            {/* 1. City Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 shadow-2xs">
              <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <label htmlFor="city-select" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">City:</label>
              <select
                id="city-select"
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="bg-transparent text-slate-800 text-xs font-bold outline-none cursor-pointer pr-1"
              >
                {availableCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* 2. Settlement Week Dropdown (All DB Weeks) */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 shadow-2xs">
              <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <label htmlFor="week-select" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Week:</label>
              <select
                id="week-select"
                value={selectedWeek}
                onChange={(e) => handleWeekChange(e.target.value)}
                className="bg-transparent text-slate-800 text-xs font-bold outline-none cursor-pointer pr-1"
              >
                <option value="All">All Settlement Weeks</option>
                {weeks.map(w => (
                  <option key={w.week_id} value={w.week_id}>
                    {w.week_id} ({w.week_start} to {w.week_end})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Search Bar (Active for tables) */}
            {activeFormat !== 'city_summary' && (
              <div className="relative flex-1 max-w-sm">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder={
                    activeFormat === 'consolidated_partner'
                      ? "Search partner name or ID..."
                      : "Search vendor name, code, or vehicle plate..."
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setPage(1);
                    }}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

          </div>

          {/* Right: Records Counter, Page Size & Flexible Export Menu */}
          <div className="flex items-center gap-3">
            
            {/* Records Counter & Page Size */}
            {activeFormat !== 'city_summary' && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
                <span>
                  Showing <strong>{records.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> - <strong>{Math.min(page * pageSize, totalCount)}</strong> of <strong>{formatNumber(totalCount)}</strong>
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
                >
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                  <option value={250}>250 / page</option>
                </select>
              </div>
            )}

            {/* Flexible Export Dropdown Button */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                disabled={isDownloading || (activeFormat !== 'city_summary' && totalCount === 0)}
                className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-3.5 py-2 text-xs font-extrabold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Download options: Master Multi-City Excel, Filtered View, City Sheet, or CSV"
              >
                {isDownloading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                <span>{isDownloading ? 'Preparing Export...' : 'Export Hisaab'}</span>
                <ChevronDown className="h-3.5 w-3.5 ml-0.5 opacity-80" />
              </button>

              {/* Export Choices Dropdown Menu */}
              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-1.5 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Select Download Format
                  </div>

                  {/* Option 1: Master Workbook */}
                  <button
                    type="button"
                    onClick={() => handleExport('master')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 flex items-start gap-2.5 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Master Hisaab (.xlsx)</div>
                      <div className="text-[11px] text-slate-500">All cities (Bangalore, Hyd, Mum, Del) + Summary sheet</div>
                    </div>
                  </button>

                  {/* Option 2: Filtered Current View */}
                  <button
                    type="button"
                    onClick={() => handleExport('filtered')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 flex items-start gap-2.5 cursor-pointer transition-colors"
                  >
                    <FileText className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Filtered Records Only (.xlsx)</div>
                      <div className="text-[11px] text-slate-500">Exports only matching records ({selectedCity}, {selectedWeek})</div>
                    </div>
                  </button>

                  {/* Option 3: Selected City Workbook */}
                  {selectedCity !== 'All Cities' && (
                    <button
                      type="button"
                      onClick={() => handleExport('city')}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 flex items-start gap-2.5 cursor-pointer transition-colors"
                    >
                      <Building2 className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-900">{selectedCity} Workbook (.xlsx)</div>
                        <div className="text-[11px] text-slate-500">All {selectedCity} data for {selectedWeek}</div>
                      </div>
                    </button>
                  )}

                  <div className="border-t border-slate-100 my-1"></div>

                  {/* Option 4: Flat CSV */}
                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 flex items-start gap-2.5 cursor-pointer transition-colors"
                  >
                    <Download className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Raw Data (.csv)</div>
                      <div className="text-[11px] text-slate-500">Fast flat CSV export for active view</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* Main Content Area */}
      {/* ────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 py-3.5 flex flex-col min-h-0">
        
        {/* ========================================================== */}
        {/* VIEW 1: PARTNER + VEHICLE (WEEKLY) - OPTIMIZED TABLE MATRIX */}
        {/* ========================================================== */}
        {activeFormat === 'vehicle_weekly' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col flex-1">
            <div className="overflow-x-auto max-h-[76vh]">
              <table className="w-full text-left text-xs border-collapse">
                
                {/* Level 1 Group Header */}
                <thead className="sticky top-0 z-30 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider select-none">
                  <tr>
                    {/* Locked Sticky Header Box for Columns 1 & 2 */}
                    <th 
                      colSpan={2} 
                      style={{ left: 0, width: '184px', minWidth: '184px', maxWidth: '184px' }} 
                      className="sticky left-0 z-30 bg-slate-200 text-slate-800 border-r-2 border-slate-300 px-3 py-2 text-left font-black"
                    >
                      Vehicle Entity
                    </th>
                    <th colSpan={9} className="px-3 py-2 bg-slate-100 text-slate-800 border-r border-slate-200">
                      Driver & Allocation Details
                    </th>
                    <th colSpan={4} className="px-3 py-2 bg-blue-50 text-blue-900 border-r border-slate-200">
                      Rental & Lease Billing
                    </th>
                    <th colSpan={8} className="px-3 py-2 bg-amber-50 text-amber-900 border-r border-slate-200">
                      OLA Operations & Revenue
                    </th>
                    <th colSpan={7} className="px-3 py-2 bg-emerald-50 text-emerald-900 border-r border-slate-200">
                      Uber Operations & Revenue
                    </th>
                    <th colSpan={4} className="px-3 py-2 bg-orange-50 text-orange-900 border-r border-slate-200">
                      Rapido Operations
                    </th>
                    <th colSpan={5} className="px-3 py-2 bg-rose-50 text-rose-900 border-r border-slate-200">
                      Penalties & Adjustments
                    </th>
                    <th colSpan={3} className="px-3 py-2 bg-purple-50 text-purple-900">
                      Net Settlement Position
                    </th>
                  </tr>
                  
                  {/* Level 2: Exact Column Headers (Allocation Status Removed for Cleanliness) */}
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-bold">
                    
                    {/* Locked Column 1: Sr. No. */}
                    <th 
                      style={{ width: '54px', minWidth: '54px', maxWidth: '54px', left: 0 }} 
                      className="sticky left-0 z-30 bg-slate-100 text-center border-r border-slate-200 py-2.5 text-slate-500 font-mono text-[10px]"
                    >
                      Sr. No.
                    </th>
                    
                    {/* Locked Column 2: Vehicle Number */}
                    <th 
                      style={{ width: '130px', minWidth: '130px', maxWidth: '130px', left: '54px' }} 
                      className="sticky left-[54px] z-30 bg-slate-100 border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.1)] py-2.5 px-3 font-bold text-slate-900"
                    >
                      Vehicle Number
                    </th>

                    {/* Driver & Allocation Details */}
                    <th className="px-3 py-2.5 min-w-[170px]">Vendor Name</th>
                    <th className="px-3 py-2.5 font-mono text-[10px] min-w-[100px]">Vendor Code</th>
                    <th className="px-3 py-2.5 min-w-[90px]">City</th>
                    <th className="px-3 py-2.5 min-w-[110px]">Vehicle Model</th>
                    <th className="px-3 py-2.5 min-w-[95px]">Rental Plan</th>
                    <th className="px-3 py-2.5 text-center font-mono text-[10px] min-w-[105px]">Allocation Start</th>
                    <th className="px-3 py-2.5 text-center font-mono text-[10px] min-w-[105px]">Allocation End</th>
                    <th className="px-3 py-2.5 text-center min-w-[75px]">Active Days</th>
                    <th className="px-3 py-2.5 text-center min-w-[80px] border-r border-slate-200 font-extrabold text-slate-900">Onroad Days</th>

                    {/* Rental & Lease Billing */}
                    <th className="px-3 py-2.5 text-right min-w-[95px]">Daily Rent</th>
                    <th className="px-3 py-2.5 text-right min-w-[95px]">Indemnity</th>
                    <th className="px-3 py-2.5 text-right min-w-[95px]">Lease Rental</th>
                    <th className="px-3 py-2.5 text-right min-w-[105px] border-r border-slate-200 font-extrabold text-slate-900">Net Lease Rent</th>

                    {/* OLA Operations */}
                    <th className="px-3 py-2.5 text-center min-w-[70px]">OLA Trips</th>
                    <th className="px-3 py-2.5 text-right min-w-[95px]">OLA Net Rev</th>
                    <th className="px-3 py-2.5 text-right min-w-[95px]">OLA Cash</th>
                    <th className="px-3 py-2.5 text-right min-w-[80px]">OLA Toll</th>
                    <th className="px-3 py-2.5 text-right min-w-[80px]">OLA GST</th>
                    <th className="px-3 py-2.5 text-right min-w-[90px]">OLA Online</th>
                    <th className="px-3 py-2.5 text-right min-w-[85px]">OLA Incent</th>
                    <th className="px-3 py-2.5 text-right min-w-[90px] border-r border-slate-200">OLA Week O/s</th>

                    {/* Uber Operations */}
                    <th className="px-3 py-2.5 text-center min-w-[75px]">Uber Trips</th>
                    <th className="px-3 py-2.5 text-right min-w-[95px]">Uber Rev</th>
                    <th className="px-3 py-2.5 text-right min-w-[95px]">Uber Cash</th>
                    <th className="px-3 py-2.5 text-right min-w-[80px]">Uber Toll</th>
                    <th className="px-3 py-2.5 text-right min-w-[95px]">Subscription</th>
                    <th className="px-3 py-2.5 text-right min-w-[90px]">Uber Incent</th>
                    <th className="px-3 py-2.5 text-right min-w-[90px] border-r border-slate-200">Uber Week O/s</th>

                    {/* Rapido Operations */}
                    <th className="px-3 py-2.5 text-center min-w-[75px]">Rapido Trips</th>
                    <th className="px-3 py-2.5 text-right min-w-[95px]">Rapido Rev</th>
                    <th className="px-3 py-2.5 text-right min-w-[80px]">Rapido Toll</th>
                    <th className="px-3 py-2.5 text-right min-w-[90px] border-r border-slate-200">Rapido Incent</th>

                    {/* Penalties & Adjustments */}
                    <th className="px-3 py-2.5 text-right min-w-[85px]">Adjustment</th>
                    <th className="px-3 py-2.5 text-right min-w-[85px]">Challan</th>
                    <th className="px-3 py-2.5 text-right min-w-[85px]">Accident</th>
                    <th className="px-3 py-2.5 text-right min-w-[95px]">DeadMile</th>
                    <th className="px-3 py-2.5 text-right min-w-[75px] border-r border-slate-200">TDS</th>

                    {/* Settlement Net Position */}
                    <th className="px-3 py-2.5 text-right min-w-[105px]">Current Week O/s</th>
                    <th className="px-3 py-2.5 text-right min-w-[115px] font-extrabold text-emerald-800 bg-emerald-50/70">To Pay Driver</th>
                    <th className="px-3 py-2.5 text-right min-w-[115px] font-extrabold text-rose-800 bg-rose-50/70">To Collect Driver</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={42} className="px-4 py-20 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                          <span className="text-xs font-semibold">Loading Hisaab settlement matrix...</span>
                        </div>
                      </td>
                    </tr>
                  ) : errorMsg ? (
                    <tr>
                      <td colSpan={42} className="px-4 py-16 text-center text-rose-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="h-6 w-6" />
                          <span className="text-xs font-semibold">{errorMsg}</span>
                        </div>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={42} className="px-4 py-20 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Info className="h-6 w-6 text-slate-300" />
                          <span className="text-xs font-semibold">No Hisaab records found for active filters.</span>
                          <span className="text-[11px] text-slate-400">Try selecting "All Cities" or another settlement week.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    records.map((r, idx) => (
                      <tr
                        key={r.hisaab_id || r.sr_no || idx}
                        onClick={() => setSelectedRecord(r)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Locked Column 1: Sr. No. */}
                        <td 
                          style={{ width: '54px', minWidth: '54px', maxWidth: '54px', left: 0 }} 
                          className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 text-center text-slate-400 font-mono text-[10px] border-r border-slate-200 py-2"
                        >
                          {r.sr_no || (page - 1) * pageSize + idx + 1}
                        </td>

                        {/* Locked Column 2: Vehicle Number */}
                        <td 
                          style={{ width: '130px', minWidth: '130px', maxWidth: '130px', left: '54px' }} 
                          className="sticky left-[54px] z-20 bg-white group-hover:bg-slate-50 border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.1)] px-3 py-2 font-mono font-bold text-slate-900"
                        >
                          {r.vehicle_number}
                        </td>

                        {/* Vendor Name */}
                        <td className="px-3 py-2 text-slate-900 font-semibold group-hover:text-emerald-700 transition-colors">
                          {r.vendor_name || r.partner_name || '-'}
                        </td>

                        {/* Vendor Code */}
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                          {r.vendor_code || r.partner_id || '-'}
                        </td>

                        {/* City */}
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {r.city || r.normalized_city || '-'}
                          </span>
                        </td>

                        {/* Vehicle Model */}
                        <td className="px-3 py-2 text-slate-600 text-[11px]">
                          {r.vehicle_model || '-'}
                        </td>

                        {/* Rental Plan */}
                        <td className="px-3 py-2 text-slate-600 text-[11px]">
                          {r.rental_plan || '-'}
                        </td>

                        {/* Allocation Start */}
                        <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-600">
                          {formatVal(r.allocation_start)}
                        </td>

                        {/* Allocation End */}
                        <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-600">
                          {formatVal(r.allocation_end)}
                        </td>

                        {/* Active Days */}
                        <td className="px-3 py-2 text-center text-slate-700 font-mono">
                          {r.active_days ?? r.allotted_days ?? '-'}
                        </td>

                        {/* Onroad Days */}
                        <td className="px-3 py-2 text-center font-bold text-slate-900 font-mono border-r border-slate-200">
                          {r.onroad_days ?? '-'}
                        </td>

                        {/* Daily Rent Applied */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.daily_rent_applied)}
                        </td>

                        {/* Weekly Indemnity Fees */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.weekly_indemnity_fees)}
                        </td>

                        {/* Weekly Lease Rental */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.weekly_lease_rental)}
                        </td>

                        {/* Net Weekly Lease Rental */}
                        <td className="px-3 py-2 text-right font-bold border-r border-slate-200">
                          {renderMoney(r.net_weekly_lease_rental)}
                        </td>

                        {/* OLA Trips */}
                        <td className="px-3 py-2 text-center">
                          {renderCount(r.ola_trips)}
                        </td>

                        {/* OLA Net Revenue */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.ola_net_revenue, { isCredit: true })}
                        </td>

                        {/* OLA Cash Collection */}
                        <td className="px-3 py-2 text-right font-mono text-amber-700">
                          {renderMoney(r.ola_cash_collection)}
                        </td>

                        {/* OLA Toll */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.ola_toll)}
                        </td>

                        {/* OLA GST */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.ola_gst)}
                        </td>

                        {/* OLA Online Payment */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.ola_online_payment)}
                        </td>

                        {/* OLA Incentive */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.ola_incentive, { isCredit: true })}
                        </td>

                        {/* OLA Week O/s */}
                        <td className="px-3 py-2 text-right border-r border-slate-200">
                          {renderMoney(r.ola_week_os)}
                        </td>

                        {/* Uber Trips */}
                        <td className="px-3 py-2 text-center">
                          {renderCount(r.uber_trips)}
                        </td>

                        {/* Uber Total Revenue */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.uber_total_revenue ?? r.uber_total_earnings, { isCredit: true })}
                        </td>

                        {/* Uber Cash Collection */}
                        <td className="px-3 py-2 text-right font-mono text-amber-700">
                          {renderMoney(r.uber_cash_collection)}
                        </td>

                        {/* Uber Toll */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.uber_toll)}
                        </td>

                        {/* Driver Subscription Charge */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.driver_subscription_charge ?? r.uber_driver_sub_charge)}
                        </td>

                        {/* Uber Incentive */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.uber_incentive, { isCredit: true })}
                        </td>

                        {/* Uber Week O/s */}
                        <td className="px-3 py-2 text-right border-r border-slate-200">
                          {renderMoney(r.uber_week_os)}
                        </td>

                        {/* Rapido Trips */}
                        <td className="px-3 py-2 text-center">
                          {renderCount(r.rapido_trips)}
                        </td>

                        {/* Rapido Net Revenue */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.rapido_net_revenue, { isCredit: true })}
                        </td>

                        {/* Rapido Toll */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.rapido_toll)}
                        </td>

                        {/* Rapido Incentive */}
                        <td className="px-3 py-2 text-right border-r border-slate-200">
                          {renderMoney(r.rapido_incentive, { isCredit: true })}
                        </td>

                        {/* Vehicle Level Adjustment */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.vehicle_level_adjustment ?? r.adjustment_amount)}
                        </td>

                        {/* Challan */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.challan ?? r.challan_amount, { isDebit: true })}
                        </td>

                        {/* Accident */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.accident ?? r.accident_deduction, { isDebit: true })}
                        </td>

                        {/* DeadMile Penalty */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.deadmile_penalty ?? r.gps_dead_mile_penalty, { isDebit: true })}
                        </td>

                        {/* TDS */}
                        <td className="px-3 py-2 text-right border-r border-slate-200">
                          {renderMoney(r.tds ?? r.tds_amount)}
                        </td>

                        {/* Current Week O/s */}
                        <td className="px-3 py-2 text-right">
                          {renderMoney(r.current_week_os)}
                        </td>

                        {/* To Pay For Driver */}
                        <td className="px-3 py-2 text-right font-mono font-bold">
                          {Number(r.to_pay_for_driver ?? r.net_payout_to_driver) > 0 ? (
                            <span className="text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                              {formatCurrency(r.to_pay_for_driver ?? r.net_payout_to_driver)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* To Collect from Driver */}
                        <td className="px-3 py-2 text-right font-mono font-bold">
                          {Number(r.to_collect_from_driver ?? r.net_to_collect_from_driver) > 0 ? (
                            <span className="text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-md">
                              {formatCurrency(r.to_collect_from_driver ?? r.net_to_collect_from_driver)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600 mt-auto">
              <div>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong> (Total <strong>{formatNumber(totalCount)}</strong> allocations)
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
          </div>
        )}

        {/* ========================================================== */}
        {/* VIEW 2: CONSOLIDATED PARTNER */}
        {/* ========================================================== */}
        {activeFormat === 'consolidated_partner' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col flex-1">
            <div className="overflow-x-auto max-h-[76vh]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 sticky top-0 z-20 border-b border-slate-200 text-slate-700 font-extrabold text-[11px]">
                  <tr>
                    <th className="px-3 py-2.5">Partner Name</th>
                    <th className="px-3 py-2.5">Partner ID</th>
                    <th className="px-3 py-2.5">City</th>
                    <th className="px-3 py-2.5">Week</th>
                    <th className="px-3 py-2.5 text-center">Cars</th>
                    <th className="px-3 py-2.5 text-center">On-Road Days</th>
                    <th className="px-3 py-2.5 text-center">Total Trips</th>
                    <th className="px-3 py-2.5 text-right">Rent Billed</th>
                    <th className="px-3 py-2.5 text-right">Platform Earnings</th>
                    <th className="px-3 py-2.5 text-right">Cash Collected</th>
                    <th className="px-3 py-2.5 text-right">Total Deductions</th>
                    <th className="px-3 py-2.5 text-right text-emerald-800">Net Payout</th>
                    <th className="px-3 py-2.5 text-right text-rose-800">Net To Collect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-20 text-center text-slate-400">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
                        <span>Loading consolidated partner data...</span>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-20 text-center text-slate-400">
                        No consolidated partner records found.
                      </td>
                    </tr>
                  ) : (
                    records.map((r, idx) => (
                      <tr key={r.partner_hisaab_id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 font-bold text-slate-900">{r.partner_name}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-500">{r.partner_id}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {r.city || r.normalized_city}
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600 mt-auto">
              <div>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong> (Total <strong>{formatNumber(totalCount)}</strong> partners)
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 font-bold text-slate-900">{page}</span>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* VIEW 3: DAILY LEDGER */}
        {/* ========================================================== */}
        {activeFormat === 'daily_ledger' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col flex-1">
            <div className="overflow-x-auto max-h-[76vh]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 sticky top-0 z-20 border-b border-slate-200 text-slate-700 font-extrabold text-[11px]">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Partner ID</th>
                    <th className="px-3 py-2.5">Vehicle Number</th>
                    <th className="px-3 py-2.5">City</th>
                    <th className="px-3 py-2.5 text-right">Daily Rent</th>
                    <th className="px-3 py-2.5 text-center">Total Trips</th>
                    <th className="px-3 py-2.5 text-right">Gross Fares</th>
                    <th className="px-3 py-2.5 text-right">Cash Collected</th>
                    <th className="px-3 py-2.5 text-right">Incentives</th>
                    <th className="px-3 py-2.5 text-right">Deductions</th>
                    <th className="px-3 py-2.5 text-right font-extrabold">Daily Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-20 text-center text-slate-400">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
                        <span>Loading daily ledger records...</span>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-20 text-center text-slate-400">
                        No daily ledger records found.
                      </td>
                    </tr>
                  ) : (
                    records.map((r, idx) => (
                      <tr key={r.ledger_id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 font-bold font-mono text-slate-900">{r.log_date}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-500">{r.partner_id}</td>
                        <td className="px-3 py-2.5 font-bold font-mono text-slate-900">{r.vehicle_number}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {r.city || r.normalized_city}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(r.net_daily_rent)}</td>
                        <td className="px-3 py-2.5 text-center font-bold">{r.total_trips}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-emerald-700 font-bold">{formatCurrency(r.total_fare_earnings)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-amber-700">{formatCurrency(r.total_cash_collected)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600">{formatCurrency(r.total_incentives)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-rose-600">{formatCurrency(r.total_deductions)}</td>
                        <td className="px-3 py-2.5 text-right font-bold font-mono text-slate-900">
                          {formatCurrency(r.daily_net_balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600 mt-auto">
              <div>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong> (Total <strong>{formatNumber(totalCount)}</strong> log entries)
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 font-bold text-slate-900">{page}</span>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* VIEW 4: CITY SUMMARY (MATCHES EXCEL SUMMARY SHEET) */}
        {/* ========================================================== */}
        {activeFormat === 'city_summary' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col flex-1">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Operating Cities Settlement Summary Matrix
                </h3>
                <p className="text-[11px] text-slate-500">
                  Consolidated financial position across all active operating hubs for {selectedWeek === 'All' ? 'all settlement weeks' : `week ${selectedWeek}`}
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                Summary Sheet Mode
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold text-[11px]">
                  <tr>
                    <th className="px-4 py-3">City Hub</th>
                    <th className="px-3 py-3 text-center">Allocations</th>
                    <th className="px-3 py-3 text-center">Partners</th>
                    <th className="px-3 py-3 text-center">On-Road Days</th>
                    <th className="px-3 py-3 text-right">Uber Earnings</th>
                    <th className="px-3 py-3 text-right">OLA Revenue</th>
                    <th className="px-3 py-3 text-right">Gross Revenue</th>
                    <th className="px-3 py-3 text-right">Net Lease Rental</th>
                    <th className="px-3 py-3 text-right">Challans</th>
                    <th className="px-3 py-3 text-right">TDS</th>
                    <th className="px-3 py-3 text-right">DeadMile Penalty</th>
                    <th className="px-3 py-3 text-right">Current Week O/S</th>
                    <th className="px-3 py-3 text-right text-emerald-800 bg-emerald-50/50">Driver Net Payout</th>
                    <th className="px-4 py-3 text-right text-rose-800 bg-rose-50/50">Driver To Collect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={14} className="px-4 py-20 text-center text-slate-400">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
                        <span>Compiling city settlement summaries...</span>
                      </td>
                    </tr>
                  ) : citySummaries.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-4 py-20 text-center text-slate-400">
                        No city summary data found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    citySummaries.map((row) => (
                      <tr key={row.city} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-extrabold text-slate-900 flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                          <span>{row.city}</span>
                        </td>
                        <td className="px-3 py-3 text-center font-bold">{formatNumber(row.total_allocations)}</td>
                        <td className="px-3 py-3 text-center text-slate-600">{formatNumber(row.real_partner_rows)}</td>
                        <td className="px-3 py-3 text-center font-mono">{formatNumber(row.onroad_days)}</td>
                        <td className="px-3 py-3 text-right font-mono">{formatCurrency(row.uber_earnings)}</td>
                        <td className="px-3 py-3 text-right font-mono">{formatCurrency(row.ola_revenue)}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(row.gross_revenue)}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(row.net_lease_rental)}</td>
                        <td className="px-3 py-3 text-right font-mono text-rose-700">{formatCurrency(row.challans)}</td>
                        <td className="px-3 py-3 text-right font-mono text-slate-600">{formatCurrency(row.tds)}</td>
                        <td className="px-3 py-3 text-right font-mono text-rose-700">{formatCurrency(row.deadmile_penalty)}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold">{formatCurrency(row.current_week_os)}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                          {formatCurrency(row.driver_net_payout)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-700 bg-rose-50/30">
                          {formatCurrency(row.driver_net_to_collect)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Total Summary Row */}
                {citySummaries.length > 0 && (
                  <tfoot className="bg-slate-100 font-extrabold border-t-2 border-slate-300 text-slate-900">
                    <tr>
                      <td className="px-4 py-3 uppercase tracking-wider text-[11px]">Total Summary</td>
                      <td className="px-3 py-3 text-center">{formatNumber(summaryTotals.total_allocations)}</td>
                      <td className="px-3 py-3 text-center">{formatNumber(summaryTotals.real_partner_rows)}</td>
                      <td className="px-3 py-3 text-center font-mono">{formatNumber(summaryTotals.onroad_days)}</td>
                      <td className="px-3 py-3 text-right font-mono">{formatCurrency(summaryTotals.uber_earnings)}</td>
                      <td className="px-3 py-3 text-right font-mono">{formatCurrency(summaryTotals.ola_revenue)}</td>
                      <td className="px-3 py-3 text-right font-mono font-black">{formatCurrency(summaryTotals.gross_revenue)}</td>
                      <td className="px-3 py-3 text-right font-mono font-black">{formatCurrency(summaryTotals.net_lease_rental)}</td>
                      <td className="px-3 py-3 text-right font-mono text-rose-700">{formatCurrency(summaryTotals.challans)}</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-700">{formatCurrency(summaryTotals.tds)}</td>
                      <td className="px-3 py-3 text-right font-mono text-rose-700">{formatCurrency(summaryTotals.deadmile_penalty)}</td>
                      <td className="px-3 py-3 text-right font-mono font-black">{formatCurrency(summaryTotals.current_week_os)}</td>
                      <td className="px-3 py-3 text-right font-mono font-black text-emerald-800 bg-emerald-100/50">
                        {formatCurrency(summaryTotals.driver_net_payout)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-rose-800 bg-rose-100/50">
                        {formatCurrency(summaryTotals.driver_net_to_collect)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

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
                  Driver Settlement Breakdown Sheet
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {selectedRecord.vendor_name || selectedRecord.partner_name || selectedRecord.vendor_code}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Car: <strong>{selectedRecord.vehicle_number || '-'}</strong> ({selectedRecord.vehicle_model || '-'}) | Allocation: <strong>{selectedRecord.allocation_start || '-'}</strong> to <strong>{selectedRecord.allocation_end || '-'}</strong>
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
                  Net Due = (Lease Rent + Cash Collected + Challans/Accidents/DeadMile) - (Uber & Ola Earnings + Incentives)
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
                    <strong className="font-mono">{formatCurrency(selectedRecord.net_weekly_lease_rental || selectedRecord.weekly_lease_rental)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Uber Cash Collected:</span>
                    <strong className="font-mono">{formatCurrency(selectedRecord.uber_cash_collection)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ola Cash Collected:</span>
                    <strong className="font-mono">{formatCurrency(selectedRecord.ola_cash_collection)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Traffic Challans:</span>
                    <strong className="font-mono">{formatCurrency(selectedRecord.challan || selectedRecord.challan_amount)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Accident Penalty:</span>
                    <strong className="font-mono">{formatCurrency(selectedRecord.accident || selectedRecord.accident_deduction)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>DeadMile Penalty:</span>
                    <strong className="font-mono">{formatCurrency(selectedRecord.deadmile_penalty || selectedRecord.gps_dead_mile_penalty)}</strong>
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
                    <strong className="font-mono text-emerald-800">{formatCurrency(selectedRecord.uber_total_revenue || selectedRecord.uber_total_earnings)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ola Net Revenue:</span>
                    <strong className="font-mono text-emerald-800">{formatCurrency(selectedRecord.ola_net_revenue)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Uber Incentive:</span>
                    <strong className="font-mono text-emerald-800">{formatCurrency(selectedRecord.uber_incentive)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ola Incentive:</span>
                    <strong className="font-mono text-emerald-800">{formatCurrency(selectedRecord.ola_incentive)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Rapido Earnings:</span>
                    <strong className="font-mono text-emerald-800">{formatCurrency(selectedRecord.rapido_net_revenue)}</strong>
                  </div>
                </div>

              </div>

              {/* Final Settlement Position Box */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Net Settlement Result</div>
                  <div className="text-sm font-semibold text-slate-200 mt-0.5">
                    {Number(selectedRecord.to_pay_for_driver || selectedRecord.net_payout_to_driver) > 0 ? (
                      <span className="text-emerald-400">Company pays Driver</span>
                    ) : (
                      <span className="text-rose-400">Driver owes Company</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black font-mono">
                    {Number(selectedRecord.to_pay_for_driver || selectedRecord.net_payout_to_driver) > 0
                      ? formatCurrency(selectedRecord.to_pay_for_driver || selectedRecord.net_payout_to_driver)
                      : formatCurrency(selectedRecord.to_collect_from_driver || selectedRecord.net_to_collect_from_driver)}
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
