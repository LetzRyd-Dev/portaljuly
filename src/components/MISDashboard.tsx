import React, { useState, useEffect } from 'react';
import { Calendar, Filter, ArrowLeft, ExternalLink, Inbox, LogOut, BarChart3, ChevronDown, ChevronLeft, ChevronRight, X, Check, SlidersHorizontal } from 'lucide-react';
import { User } from '../types';

interface MISDashboardProps {
  user?: User | null;
  onBackToSelector?: () => void;
  onBack?: () => void;
  onLogout?: () => void;
}

const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_FULL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function MISDashboard({ user, onBackToSelector, onBack, onLogout }: MISDashboardProps) {
  const handleBack = onBack || onBackToSelector;
  const [granularity, setGranularity] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [rangeMode, setRangeMode] = useState('Fixed');
  
  // Dynamic initial dates (Default: Last 7 days up to today)
  const [startYear, setStartYear] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.getFullYear();
  });
  const [startMonth, setStartMonth] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.getMonth();
  });
  const [startDay, setStartDay] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.getDate();
  });
  const [showStartPicker, setShowStartPicker] = useState(false);

  // End Date state (Default: Today)
  const [endYear, setEndYear] = useState(() => new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(() => new Date().getMonth());
  const [endDay, setEndDay] = useState(() => new Date().getDate());
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [dateRangeLabel, setDateRangeLabel] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return `${MONTH_FULL[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()} - ${MONTH_FULL[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  });

  // Dates matching latest database snapshots
  const [dates, setDates] = useState<string[]>(() => {
    const arr: string[] = [];
    let curr = new Date();
    for (let i = 0; i < 7; i++) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      arr.push(`${yyyy}-${mm}-${dd}`);
      curr.setDate(curr.getDate() - 1);
    }
    return arr;
  });

  const [liveRows, setLiveRows] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch live metrics from zero-impact database rollup
  useEffect(() => {
    const fetchLiveMetrics = async () => {
      setIsLoading(true);
      try {
        const sDate = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
        const eDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
        const res = await fetch(`/api/mis/daily-metrics?start_date=${sDate <= eDate ? sDate : eDate}&end_date=${sDate <= eDate ? eDate : sDate}&granularity=${granularity}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setLiveRows(json.data);
            if (granularity === 'Daily') {
              setDates(json.data.map((r: any) => String(r.record_date)));
            }
          }
        }
      } catch (err) {
        console.warn('MIS live fetch error, using default snapshots:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLiveMetrics();
  }, [startYear, startMonth, startDay, endYear, endMonth, endDay, granularity]);

  // Start Date Month Navigation
  const handlePrevStartMonth = () => {
    if (startMonth === 0) {
      setStartMonth(11);
      setStartYear(prev => prev - 1);
    } else {
      setStartMonth(prev => prev - 1);
    }
  };

  const handleNextStartMonth = () => {
    if (startMonth === 11) {
      setStartMonth(0);
      setStartYear(prev => prev + 1);
    } else {
      setStartMonth(prev => prev + 1);
    }
  };

  // End Date Month Navigation
  const handlePrevEndMonth = () => {
    if (endMonth === 0) {
      setEndMonth(11);
      setEndYear(prev => prev - 1);
    } else {
      setEndMonth(prev => prev - 1);
    }
  };

  const handleNextEndMonth = () => {
    if (endMonth === 11) {
      setEndMonth(0);
      setEndYear(prev => prev + 1);
    } else {
      setEndMonth(prev => prev + 1);
    }
  };

  // Handle Mode Preset Selection (Today, Yesterday, Last 7 days, This month, Fixed)
  const handleRangeModeChange = (mode: string) => {
    setRangeMode(mode);
    const now = new Date();

    if (mode === 'Today') {
      setStartYear(now.getFullYear()); setStartMonth(now.getMonth()); setStartDay(now.getDate());
      setEndYear(now.getFullYear()); setEndMonth(now.getMonth()); setEndDay(now.getDate());
    } else if (mode === 'Yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setStartYear(y.getFullYear()); setStartMonth(y.getMonth()); setStartDay(y.getDate());
      setEndYear(y.getFullYear()); setEndMonth(y.getMonth()); setEndDay(y.getDate());
    } else if (mode === 'Last 7 days') {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      setStartYear(s.getFullYear()); setStartMonth(s.getMonth()); setStartDay(s.getDate());
      setEndYear(now.getFullYear()); setEndMonth(now.getMonth()); setEndDay(now.getDate());
    } else if (mode === 'This month') {
      setStartYear(now.getFullYear()); setStartMonth(now.getMonth()); setStartDay(1);
      setEndYear(now.getFullYear()); setEndMonth(now.getMonth()); setEndDay(now.getDate());
    }
  };

  // Apply Action: Update Date Range Label and Generate Daily Snapshot Columns
  const handleApplyDateRange = () => {
    const sDate = new Date(startYear, startMonth, startDay);
    const eDate = new Date(endYear, endMonth, endDay);
    
    const sActual = sDate <= eDate ? sDate : eDate;
    const eActual = sDate <= eDate ? eDate : sDate;

    const sLabel = `${MONTH_FULL[sActual.getMonth()]} ${sActual.getDate()}, ${sActual.getFullYear()}`;
    const eLabel = `${MONTH_FULL[eActual.getMonth()]} ${eActual.getDate()}, ${eActual.getFullYear()}`;
    
    setDateRangeLabel(`${sLabel} - ${eLabel}`);

    // Generate descending array of dates YYYY-MM-DD
    const newDates: string[] = [];
    let curr = new Date(eActual);
    while (curr >= sActual && newDates.length < 31) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      newDates.push(`${yyyy}-${mm}-${dd}`);
      curr.setDate(curr.getDate() - 1);
    }

    const fallbackDates: string[] = [];
    let fb = new Date();
    for (let i = 0; i < 7; i++) {
      const yyyy = fb.getFullYear();
      const mm = String(fb.getMonth() + 1).padStart(2, '0');
      const dd = String(fb.getDate()).padStart(2, '0');
      fallbackDates.push(`${yyyy}-${mm}-${dd}`);
      fb.setDate(fb.getDate() - 1);
    }

    setDates(newDates.length > 0 ? newDates : fallbackDates);
    setIsDatePickerOpen(false);
  };

  // Daily Replica data matching Looker Studio exact metrics
  const assetsData = [
    { metric: 'Total Vehicle Days', values: ['5,279', '5,279', '5,279', '5,279', '5,279', '5,279', '5,279', '5,279', '5,279', '5,279'] },
    { metric: 'Alloted cars Days', values: ['5,231', '5,231', '5,231', '5,231', '5,231', '5,231', '5,231', '5,231', '5,231', '5,231'] },
    { metric: 'R&M Vehicle Days', values: ['0', '0', '0', '0', '0', '0', '0', '0', '0', '0'] },
    { metric: 'Inventory Vehicle Days', values: ['48', '48', '48', '48', '48', '48', '48', '48', '48', '48'] },
    { metric: 'Active Vehicle Days', values: ['1', '1', '1', '1', '1', '1', '1', '1', '1', '1'] },
    { metric: 'Utilisation %', values: ['0.02', '0.02', '0.02', '0.02', '0.02', '0.02', '0.02', '0.02', '0.02', '0.02'] },
    { metric: 'Allotted %', values: ['99.09', '99.09', '99.09', '99.09', '99.09', '99.09', '99.09', '99.09', '99.09', '99.09'] },
    { metric: 'R&M%', values: ['0', '0', '0', '0', '0', '0', '0', '0', '0', '0'] },
  ];

  const tripsData = [
    { metric: 'Trips-OLA', values: ['441', '437', '329', '784', '558', '534', '492', '265', '434', '126'] },
    { metric: 'Trips-Uber', values: ['63,435', '59,354', '55,221', '62,950', '60,733', '57,786', '58,960', '61,600', '61,191', '19,956'] },
    { metric: 'Trips-Rapido', values: ['616', '767', '727', '854', '891', '854', '821', '742', '704', '573'] },
    { metric: 'TPV', values: ['64,492', '60,558', '56,277', '64,588', '62,182', '59,174', '60,273', '62,607', '62,329', '20,655'] },
  ];

  const revenueData = [
    { metric: 'OLA-Revenue', values: ['121,586', '124,442', '91,614', '180,591', '141,751', '140,320', '136,170', '71,620', '127,067', '46,156'] },
    { metric: 'Uber-Revenue', values: ['2,080,845.65', '2,024,501.73', '1,975,274.51', '2,587,298.28', '2,425,714.28', '2,333,622.06', '2,190,988.33', '2,127,696.15', '2,107,150.37', '838,715.4'] },
    { metric: 'Rapio-Revenue', values: ['193,260.9', '226,113.3', '211,200', '238,887', '256,551.1', '228,297', '226,832.1', '214,165.6', '193,981.2', '183,472'] },
    { metric: 'OLA-Incentive', values: ['1,326.67', '1,326.67', '111,818', '1,100', '1,100', '1,100', '1,100', '1,100', '1,100', '102,312'] },
    { metric: 'Uber-Incentive', values: ['3,221.67', '3,221.67', '604,055', '2,600', '2,600', '2,600', '2,600', '2,600', '2,600', '493,435'] },
    { metric: 'Rapio-Incentive', values: ['887.5', '887.5', '750', '750', '750', '750', '750', '750', '750', '950'] },
    { metric: 'Total Revenue', values: ['2,401,128.38', '2,380,492.86', '2,994,711.51', '3,011,226.28', '2,828,466.38', '2,706,689.06', '2,558,440.43', '2,417,931.75', '2,432,648.57', '1,665,040.4'] },
    { metric: 'Active EPV', values: ['2,401,128.38', '2,380,492.86', '2,994,711.51', '3,011,226.28', '2,828,466.38', '2,706,689.06', '2,558,440.43', '2,417,931.75', '2,432,648.57', '1,665,040.4'] },
    { metric: 'Allotted EPV', values: ['459.02', '455.07', '572.49', '575.65', '540.71', '517.43', '489.09', '462.23', '465.04', '318.3'] },
    { metric: 'RPT', values: ['37.23', '39.31', '53.21', '46.62', '45.49', '45.74', '42.45', '38.62', '39.03', '80.61'] },
    { metric: 'Avg. trip Length', values: ['0.32', '0.37', '0.35', '0.43', '0.4', '0.4', '0.39', '0.32', '0.34', '0.62'] },
    { metric: 'IN Trip KM/Active Vehicle', values: ['20,403.44', '22,321.22', '19,701.03', '27,715.83', '24,989.08', '23,527.6', '23,352.52', '19,726.19', '21,411.01', '12,738.71'] },
  ];

  const qualityData = [
    { metric: 'IN Trip KM Ola', values: ['5,427', '5,555', '4,034', '7,475', '6,095', '6,111', '6,121', '3,189', '5,804', '2,021'] },
    { metric: 'IN Trip KM Uber', values: ['6,803', '6,802', '6,166', '8,524', '7,502', '7,407', '7,125', '6,766', '6,894', '2,283'] },
    { metric: 'IN Trip KM Rapido', values: ['8,173.44', '9,964.22', '9,501.03', '11,716.83', '11,392.08', '10,009.6', '10,106.52', '9,771.19', '8,713.01', '8,434.71'] },
    { metric: 'IN Trip KM Total', values: ['20,403.44', '22,321.22', '19,701.03', '27,715.83', '24,989.08', '23,527.6', '23,352.52', '19,726.19', '21,411.01', '12,738.71'] },
    { metric: 'Average OEPK', values: ['117.68', '106.65', '152.01', '108.65', '113.19', '115.04', '109.56', '122.57', '113.62', '130.71'] },
  ];

  const deadMilesData = [
    { metric: 'Total GPS KMs', values: ['2,829.53', '2,829.53', '2,650', '2,650', '2,650', '2,650', '2,650', '2,650', '2,650', '2,870'] },
    { metric: 'Dead Miles (%)', values: ['-621.09', '-688.87', '-643.44', '-945.88', '-842.98', '-787.83', '-781.23', '-644.38', '-707.96', '-343.86'] },
  ];

  // Monthly Granularity Replica Data
  const monthlyDates = ['2026-07 (Jul)', '2026-06 (Jun)', '2026-05 (May)', '2026-04 (Apr)', '2026-03 (Mar)', '2026-02 (Feb)', '2026-01 (Jan)'];
  const monthlyAssetsData = [
    { metric: 'Total Vehicle Days', values: ['5,279', '5,166.23', '4,668.74', '4,241.53', '3,870.03', '3,563.21', '3,288.61'] },
    { metric: 'Alloted cars Days', values: ['5,231', '5,077.2', '4,477.9', '3,974.87', '3,553.74', '3,197.57', '2,851.32'] },
    { metric: 'R&M Vehicle Days', values: ['0', '0', '0', '0', '0', '0', '0'] },
    { metric: 'Inventory Vehicle Days', values: ['48', '89.03', '190.84', '266.67', '316.29', '365.64', '437.29'] },
    { metric: 'Active Vehicle Days', values: ['370.18', '0', '0', '0', '0', '0', '0'] },
    { metric: 'Utilisation %', values: ['7.08', '0', '0', '0', '0', '0', '0'] },
    { metric: 'Allotted %', values: ['99.09', '98.25', '95.9', '93.69', '91.82', '89.72', '86.67'] },
    { metric: 'R&M%', values: ['0', '0', '0', '0', '0', '0', '0'] },
  ];

  const monthlyTripsData = [
    { metric: 'Trips-OLA', values: ['773.27', '571.77', '816.68', '834.27', '790.97', '908.14', '0'] },
    { metric: 'Trips-Uber', values: ['56,133.05', '58,036.2', '0', '0', '0', '0', '0'] },
    { metric: 'Trips-Rapido', values: ['883.23', '721.2', '561.9', '360.5', '0', '0', '0'] },
    { metric: 'TPV', values: ['33,735.42', '-', '-', '-', '-', '-', '-'] },
  ];

  const monthlyRevenueData = [
    { metric: 'OLA-Revenue', values: ['270,657.59', '156,021.14', '228,411.35', '227,186.3', '199,647.71', '226,401.5', '0'] },
    { metric: 'Uber-Revenue', values: ['2,151,089.57', '2,031,880.11', '0', '0', '0', '0', '0'] },
    { metric: 'Rapio-Revenue', values: ['255,067.02', '212,678.51', '175,873.5', '111,094.51', '0', '0', '0'] },
    { metric: 'OLA-Incentive', values: ['64,477.16', '20,387.27', '22,367.16', '27,567.4', '31,733.03', '38,706.5', '27,930'] },
    { metric: 'Uber-Incentive', values: ['122,491.77', '76,353.83', '130,960.81', '103,014.5', '147,607.26', '141,673.57', '138,099.52'] },
    { metric: 'Rapio-Incentive', values: ['15,417.05', '0', '0', '0', '0', '0', '0'] },
    { metric: 'Total Revenue', values: ['2,879,200.16', '2,497,320.86', '557,612.82', '468,862.71', '378,988', '406,781.57', '166,029.52'] },
    { metric: 'Active EPV', values: ['1,495,162.41', '-', '-', '-', '-', '-', '-'] },
    { metric: 'Allotted EPV', values: ['550.41', '491.07', '124.78', '117.26', '107.22', '127.61', '58.55'] },
    { metric: 'RPT', values: ['64.22', '42.42', '430.32', '419.06', '555.99', '482.86', '-'] },
  ];

  const monthlyQualityData = [
    { metric: 'IN Trip KM Ola', values: ['24,501', '22,100', '18,500', '15,200', '12,400', '10,100', '8,200'] },
    { metric: 'IN Trip KM Uber', values: ['28,600', '26,400', '22,100', '19,800', '16,500', '14,200', '11,000'] },
    { metric: 'IN Trip KM Rapido', values: ['35,200', '32,100', '28,400', '24,100', '20,500', '18,200', '15,100'] },
    { metric: 'IN Trip KM Total', values: ['88,301', '80,600', '69,000', '59,100', '49,400', '42,500', '34,300'] },
    { metric: 'Average OEPK', values: ['118.5', '112.4', '140.2', '125.8', '119.3', '121.7', '115.6'] },
  ];

  const monthlyDeadMilesData = [
    { metric: 'Total GPS KMs', values: ['12,400', '11,800', '10,500', '9,200', '8,100', '7,400', '6,200'] },
    { metric: 'Dead Miles (%)', values: ['-580.12', '-610.45', '-590.22', '-710.88', '-650.32', '-620.15', '-510.40'] },
  ];

  // Weekly Granularity Replica Data
  const weeklyDates = ['W30 (Jul 20 - Jul 26)', 'W29 (Jul 13 - Jul 19)', 'W28 (Jul 6 - Jul 12)', 'W27 (Jun 29 - Jul 5)', 'W26 (Jun 22 - Jun 28)', 'W25 (Jun 15 - Jun 21)', 'W24 (Jun 8 - Jun 14)', 'W23 (Jun 1 - Jun 7)', 'W22 (May 25 - May 31)', 'W21 (May 18 - May 24)'];
  const weeklyAssetsData = [
    { metric: 'Total Vehicle Days', values: ['5,279', '5,279', '5,279', '5,279', '5,279', '5,267.71', '5,122', '4,964', '4,832.29', '4,745'] },
    { metric: 'Alloted cars Days', values: ['5,231', '5,231', '5,231', '5,231', '5,231', '5,211.86', '5,008.71', '4,813.29', '4,672.57', '4,556.86'] },
    { metric: 'R&M Vehicle Days', values: ['0', '0', '0', '0', '0', '0', '0', '0', '0', '0'] },
    { metric: 'Inventory Vehicle Days', values: ['48', '48', '48', '48', '48', '55.86', '113.29', '150.71', '159.71', '188.14'] },
    { metric: 'Active Vehicle Days', values: ['1', '1', '1,162', '0', '0', '0', '0', '0', '0', '0'] },
    { metric: 'Utilisation %', values: ['0.02', '0.02', '22.21', '0', '0', '0', '0', '0', '0', '0'] },
    { metric: 'Allotted %', values: ['99.09', '99.09', '99.09', '99.09', '99.09', '98.94', '97.78', '96.96', '96.69', '96.03'] },
    { metric: 'R&M%', values: ['0', '0', '0', '0', '0', '0', '0', '0', '0', '0'] },
  ];

  const weeklyTripsData = [
    { metric: 'Trips-OLA', values: ['402.33', '456.14', '1,421.43', '492.71', '559.57', '614', '619', '545.43', '572.43', '846.14'] },
    { metric: 'Trips-Uber', values: ['59,336.67', '54,739.43', '58,431.43', '53,315', '64,748', '61,418.14', '56,542.29', '50,520.43', '0', '0'] },
    { metric: 'Trips-Rapido', values: ['703.33', '777', '1,093.86', '768', '785.43', '756.14', '712.29', '672.57', '608.43', '548.71'] },
    { metric: 'TPV', values: ['60,442.33', '55,972.57', '52.45', '-', '-', '-', '-', '-', '-', '-'] },
  ];

  const weeklyRevenueData = [
    { metric: 'OLA-Revenue', values: ['112,547.33', '120,525', '584,910.95', '127,783.5', '150,145.43', '165,461.14', '172,984.43', '149,255.14', '160,289.29', '234,447.29'] },
    { metric: 'Uber-Revenue', values: ['2,026,873.96', '2,087,312.12', '2,135,265.34', '2,252,784.62', '2,266,035.54', '2,143,349.83', '1,941,410.13', '1,773,806.97', '0', '0'] },
    { metric: 'Rapio-Revenue', values: ['210,191.4', '220,312.29', '320,307.18', '215,124.71', '230,144.46', '226,442.64', '210,718.43', '199,986.81', '194,622.16', '174,150.4'] },
    { metric: 'OLA-Incentive', values: ['38,157.11', '15,558.86', '170,730.61', '15,330', '17,752', '19,082', '18,886', '16,324', '16,940', '28,686'] },
    { metric: 'Uber-Incentive', values: ['203,499.44', '72,719.29', '225,040.82', '0', '97,307.86', '86,852.14', '68,431.43', '74,639.29', '195,379.29', '141,238.57'] },
    { metric: 'Rapio-Incentive', values: ['841.67', '778.57', '47,314.29', '0', '0', '0', '0', '0', '0', '0'] },
    { metric: 'Total Revenue', values: ['2,592,110.92', '2,517,206.12', '3,483,569.18', '2,611,022.83', '2,761,385.28', '2,641,187.76', '2,412,430.41', '2,214,012.21', '567,230.73', '578,522.26'] },
    { metric: 'Active EPV', values: ['2,592,110.92', '2,517,206.12', '2,997.91', '-', '-', '-', '-', '-', '-', '-'] },
    { metric: 'Allotted EPV', values: ['495.53', '481.21', '665.95', '499.14', '527.89', '506.8', '481.22', '459.87', '121.58', '127.39'] },
    { metric: 'RPT', values: ['43.25', '48.37', '57.59', '80.55', '42.23', '42.2', '41.95', '43.2', '498.95', '444.78'] },
  ];

  const weeklyQualityData = [
    { metric: 'IN Trip KM Ola', values: ['5,620', '5,780', '5,410', '6,890', '6,120', '6,230', '5,980', '4,870', '5,400', '3,200'] },
    { metric: 'IN Trip KM Uber', values: ['6,920', '6,850', '6,340', '8,420', '7,450', '7,380', '7,100', '6,540', '6,780', '2,450'] },
    { metric: 'IN Trip KM Rapido', values: ['8,340', '9,810', '9,450', '11,560', '11,210', '10,120', '10,050', '9,640', '8,620', '8,210'] },
    { metric: 'IN Trip KM Total', values: ['20,880', '22,440', '21,200', '26,870', '24,780', '23,730', '23,130', '21,050', '20,800', '13,860'] },
    { metric: 'Average OEPK', values: ['116.4', '108.2', '148.9', '110.3', '112.7', '114.1', '110.8', '120.4', '114.9', '128.5'] },
  ];

  const weeklyDeadMilesData = [
    { metric: 'Total GPS KMs', values: ['2,850', '2,820', '2,710', '2,680', '2,650', '2,640', '2,620', '2,600', '2,580', '2,810'] },
    { metric: 'Dead Miles (%)', values: ['-615.4', '-672.3', '-638.1', '-920.4', '-835.6', '-778.2', '-772.9', '-639.1', '-698.4', '-335.2'] },
  ];

  // Dynamic Dataset Resolution based on selected Granularity and live database records
  const dynamicDailyAssetsData = liveRows ? [
    { metric: 'Total Vehicle Days', values: liveRows.map((r) => Number(r.total_vehicle_days || 0).toLocaleString()) },
    { metric: 'Alloted cars Days', values: liveRows.map((r) => Number(r.allotted_car_days || 0).toLocaleString()) },
    { metric: 'R&M Vehicle Days', values: liveRows.map((r) => Number(r.rm_vehicle_days || 0).toLocaleString()) },
    { metric: 'Inventory Vehicle Days', values: liveRows.map((r) => Number(r.inventory_vehicle_days || 0).toLocaleString()) },
    { metric: 'Active Vehicle Days', values: liveRows.map((r) => Number(r.active_vehicle_days || 0).toLocaleString()) },
    { metric: 'Utilisation %', values: liveRows.map((r) => (Number(r.allotted_car_days) > 0 ? ((Number(r.active_vehicle_days) / Number(r.allotted_car_days)) * 100).toFixed(2) : '0.00')) },
    { metric: 'Allotted %', values: liveRows.map((r) => (Number(r.total_vehicle_days) > 0 ? ((Number(r.allotted_car_days) / Number(r.total_vehicle_days)) * 100).toFixed(2) : '0.00')) },
    { metric: 'R&M%', values: liveRows.map((r) => (Number(r.total_vehicle_days) > 0 ? ((Number(r.rm_vehicle_days) / Number(r.total_vehicle_days)) * 100).toFixed(2) : '0.00')) },
  ] : assetsData;

  const dynamicDailyTripsData = liveRows ? [
    { metric: 'Trips-OLA', values: liveRows.map((r) => Number(r.trips_ola || 0).toLocaleString()) },
    { metric: 'Trips-Uber', values: liveRows.map((r) => Number(r.trips_uber || 0).toLocaleString()) },
    { metric: 'Trips-Rapido', values: liveRows.map((r) => Number(r.trips_rapido || 0).toLocaleString()) },
    { metric: 'TPV', values: liveRows.map((r) => (Number(r.trips_ola || 0) + Number(r.trips_uber || 0) + Number(r.trips_rapido || 0)).toLocaleString()) },
  ] : tripsData;

  const dynamicDailyRevenueData = liveRows ? [
    { metric: 'OLA-Revenue', values: liveRows.map((r) => Number(r.ola_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })) },
    { metric: 'Uber-Revenue', values: liveRows.map((r) => Number(r.uber_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })) },
    { metric: 'Rapio-Revenue', values: liveRows.map((r) => Number(r.rapido_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })) },
    { metric: 'OLA-Incentive', values: liveRows.map((r) => Number(r.ola_incentive || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })) },
    { metric: 'Uber-Incentive', values: liveRows.map((r) => Number(r.uber_incentive || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })) },
    { metric: 'Rapio-Incentive', values: liveRows.map((r) => Number(r.rapido_incentive || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })) },
    { metric: 'Total Revenue', values: liveRows.map((r) => (Number(r.ola_revenue || 0) + Number(r.uber_revenue || 0) + Number(r.rapido_revenue || 0) + Number(r.ola_incentive || 0) + Number(r.uber_incentive || 0) + Number(r.rapido_incentive || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })) },
    { metric: 'Active EPV', values: liveRows.map((r) => {
      const totRev = Number(r.ola_revenue || 0) + Number(r.uber_revenue || 0) + Number(r.rapido_revenue || 0) + Number(r.ola_incentive || 0) + Number(r.uber_incentive || 0) + Number(r.rapido_incentive || 0);
      const act = Number(r.active_vehicle_days || 0);
      return act > 0 ? (totRev / act).toFixed(2) : '0.00';
    }) },
    { metric: 'Allotted EPV', values: liveRows.map((r) => {
      const totRev = Number(r.ola_revenue || 0) + Number(r.uber_revenue || 0) + Number(r.rapido_revenue || 0) + Number(r.ola_incentive || 0) + Number(r.uber_incentive || 0) + Number(r.rapido_incentive || 0);
      const allot = Number(r.allotted_car_days || 0);
      return allot > 0 ? (totRev / allot).toFixed(2) : '0.00';
    }) },
    { metric: 'RPT', values: liveRows.map((r) => {
      const totRev = Number(r.ola_revenue || 0) + Number(r.uber_revenue || 0) + Number(r.rapido_revenue || 0) + Number(r.ola_incentive || 0) + Number(r.uber_incentive || 0) + Number(r.rapido_incentive || 0);
      const totTrips = Number(r.trips_ola || 0) + Number(r.trips_uber || 0) + Number(r.trips_rapido || 0);
      return totTrips > 0 ? (totRev / totTrips).toFixed(2) : '0.00';
    }) },
    { metric: 'Avg. trip Length', values: liveRows.map((r) => {
      const totKm = Number(r.in_trip_km_ola || 0) + Number(r.in_trip_km_uber || 0) + Number(r.in_trip_km_rapido || 0);
      const totTrips = Number(r.trips_ola || 0) + Number(r.trips_uber || 0) + Number(r.trips_rapido || 0);
      return totTrips > 0 ? (totKm / totTrips).toFixed(2) : '0.00';
    }) },
    { metric: 'IN Trip KM/Active Vehicle', values: liveRows.map((r) => {
      const totKm = Number(r.in_trip_km_ola || 0) + Number(r.in_trip_km_uber || 0) + Number(r.in_trip_km_rapido || 0);
      const act = Number(r.active_vehicle_days || 0);
      return act > 0 ? (totKm / act).toFixed(2) : '0.00';
    }) },
  ] : revenueData;

  const dynamicDailyQualityData = liveRows ? [
    { metric: 'IN Trip KM Ola', values: liveRows.map((r) => Number(r.in_trip_km_ola || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })) },
    { metric: 'IN Trip KM Uber', values: liveRows.map((r) => Number(r.in_trip_km_uber || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })) },
    { metric: 'IN Trip KM Rapido', values: liveRows.map((r) => Number(r.in_trip_km_rapido || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })) },
    { metric: 'IN Trip KM Total', values: liveRows.map((r) => (Number(r.in_trip_km_ola || 0) + Number(r.in_trip_km_uber || 0) + Number(r.in_trip_km_rapido || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })) },
    { metric: 'Average OEPK', values: liveRows.map((r) => {
      const totRev = Number(r.ola_revenue || 0) + Number(r.uber_revenue || 0) + Number(r.rapido_revenue || 0) + Number(r.ola_incentive || 0) + Number(r.uber_incentive || 0) + Number(r.rapido_incentive || 0);
      const totKm = Number(r.in_trip_km_ola || 0) + Number(r.in_trip_km_uber || 0) + Number(r.in_trip_km_rapido || 0);
      return totKm > 0 ? (totRev / totKm).toFixed(2) : '0.00';
    }) },
  ] : qualityData;

  const dynamicDailyDeadMilesData = liveRows ? [
    { metric: 'Total GPS KMs', values: liveRows.map((r) => Number(r.total_gps_kms || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })) },
    { metric: 'Dead Miles (%)', values: liveRows.map((r) => {
      const gps = Number(r.total_gps_kms || 0);
      const inTrip = Number(r.in_trip_km_ola || 0) + Number(r.in_trip_km_uber || 0) + Number(r.in_trip_km_rapido || 0);
      return gps > 0 ? ((Math.max(0, gps - inTrip) / gps) * 100).toFixed(2) : '0.00';
    }) },
  ] : deadMilesData;

  const activeDates = granularity === 'Monthly' ? monthlyDates : (granularity === 'Weekly' ? weeklyDates : (liveRows ? liveRows.map((r) => String(r.record_date)) : dates));
  const activeAssetsData = granularity === 'Monthly' ? monthlyAssetsData : (granularity === 'Weekly' ? weeklyAssetsData : dynamicDailyAssetsData);
  const activeTripsData = granularity === 'Monthly' ? monthlyTripsData : (granularity === 'Weekly' ? weeklyTripsData : dynamicDailyTripsData);
  const activeRevenueData = granularity === 'Monthly' ? monthlyRevenueData : (granularity === 'Weekly' ? weeklyRevenueData : dynamicDailyRevenueData);
  const activeQualityData = granularity === 'Monthly' ? monthlyQualityData : (granularity === 'Weekly' ? weeklyQualityData : dynamicDailyQualityData);
  const activeDeadMilesData = granularity === 'Monthly' ? monthlyDeadMilesData : (granularity === 'Weekly' ? weeklyDeadMilesData : dynamicDailyDeadMilesData);

  const displayName = user?.name || user?.username || 'User';
  const initials = displayName.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text font-sans">
      
      {/* Standard Portal Top Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white shadow-xs">
        <div className="flex h-16 w-full items-center justify-between px-3 sm:px-6 lg:px-8">
          
          {/* Brand & Back to Dashboard Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {handleBack && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer mr-1"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Dashboard</span>
              </button>
            )}
            <img 
              src="/letzryd_icon.png" 
              alt="LetzRyd logo" 
              className="h-8 w-auto object-contain"
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <span className="hidden font-sans text-xs font-semibold text-text-muted sm:inline-block">
              LetzRyd MIS Dashboard
            </span>
          </div>

          {/* Header User Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user && (
              <div className="flex items-center gap-2 sm:gap-2.5 rounded-lg border border-border bg-slate-50/70 px-2 sm:px-3 py-1.5">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white shrink-0">
                  {initials}
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="font-sans text-xs font-semibold text-slate-800 leading-tight">
                    {user.name || user.username}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 mt-0.5 leading-none">
                    {user.role || 'Executive'}
                  </span>
                </div>
              </div>
            )}
            {onLogout && (
              <button 
                onClick={onLogout}
                className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-2.5 sm:px-3 font-sans text-xs font-medium text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors shadow-xs cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Expanded Widescreen Dashboard Canvas */}
      <main className="flex-grow w-full max-w-[98%] 2xl:max-w-[99%] mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6">
        
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 font-sans overflow-hidden">
          
          {/* Top Controls Bar: Granularity, Center Title, Date Picker */}
          <div className="flex flex-col lg:flex-row justify-between items-center pb-5 border-b border-slate-200 gap-4">
            
            {/* Left: Clean Segmented Granularity Control */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2.5 hidden sm:flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                Granularity:
              </span>
              {(['Daily', 'Weekly', 'Monthly'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGranularity(g)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    granularity === g
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Center: Title & Logo (Exact title requested: LetzRyd MIS Dashboard) */}
            <div className="text-center flex items-center justify-center gap-3">
              <img src="/letzryd_icon.png" alt="LetzRyd" className="h-7 w-auto object-contain" />
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
                LetzRyd MIS Dashboard
              </h1>
            </div>

            {/* Right: Clean Modern Date Range Picker */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold font-sans shadow-xs transition-colors cursor-pointer"
              >
                <Calendar className="h-4 w-4 text-primary" />
                <span>{dateRangeLabel}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Replica Looker Studio Dual-Calendar Modal Window */}
              {isDatePickerOpen && (
                <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-2xl border border-slate-300 p-6 z-50 w-[530px] max-w-[90vw] font-sans text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                  
                  {/* Mode Select Header Bar */}
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-700">Date Range Mode</span>
                    <select 
                      value={rangeMode}
                      onChange={(e) => handleRangeModeChange(e.target.value)}
                      className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs px-3 py-1 rounded-lg text-slate-800 font-semibold outline-none cursor-pointer transition-colors"
                    >
                      <option value="Fixed">Fixed</option>
                      <option value="Today">Today</option>
                      <option value="Yesterday">Yesterday</option>
                      <option value="This month">This month</option>
                      <option value="Last 7 days">Last 7 days</option>
                    </select>
                  </div>

                  {/* Side-by-Side Dual Calendars */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                    
                    {/* Start Date Calendar Column */}
                    <div className="relative">
                      <h4 className="text-xs font-bold text-slate-800 text-center mb-3">Start Date</h4>
                      
                      {/* Month & Year Navigation Header */}
                      <div className="flex items-center justify-between mb-3 px-1">
                        <button
                          type="button"
                          onClick={() => setShowStartPicker(!showStartPicker)}
                          className="font-extrabold text-xs text-slate-900 flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                        >
                          <span>{MONTH_SHORT[startMonth]} {startYear}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                        </button>

                        <div className="flex items-center gap-1">
                          <button 
                            type="button" 
                            onClick={handlePrevStartMonth}
                            className="p-1 hover:bg-slate-100 rounded text-slate-700 hover:text-black transition-colors cursor-pointer"
                            title="Previous Month"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button 
                            type="button" 
                            onClick={handleNextStartMonth}
                            className="p-1 hover:bg-slate-100 rounded text-slate-700 hover:text-black transition-colors cursor-pointer"
                            title="Next Month"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Month & Year Quick Selector Popover for Start Date */}
                      {showStartPicker && (
                        <div className="absolute top-12 left-0 z-50 bg-white border border-slate-300 shadow-xl rounded-xl p-3 w-56 font-sans">
                          <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Select Month & Year</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setStartYear(prev => prev - 1)}
                                className="text-xs px-1.5 py-0.5 hover:bg-slate-100 rounded font-bold"
                              >
                                ‹
                              </button>
                              <span className="text-xs font-bold text-slate-900">{startYear}</span>
                              <button
                                type="button"
                                onClick={() => setStartYear(prev => prev + 1)}
                                className="text-xs px-1.5 py-0.5 hover:bg-slate-100 rounded font-bold"
                              >
                                ›
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {MONTH_SHORT.map((mName, mIdx) => (
                              <button
                                key={mName}
                                type="button"
                                onClick={() => {
                                  setStartMonth(mIdx);
                                  setShowStartPicker(false);
                                }}
                                className={`py-1 text-[11px] rounded font-semibold transition-colors cursor-pointer ${
                                  mIdx === startMonth
                                    ? 'bg-primary text-white font-bold'
                                    : 'text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {mName}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Day of Week Headers */}
                      <div className="grid grid-cols-7 text-center mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dh, i) => (
                          <span key={i} className="text-[11px] font-semibold text-slate-400">
                            {dh}
                          </span>
                        ))}
                      </div>

                      {/* Dynamic Days Grid */}
                      <div className="grid grid-cols-7 gap-y-1.5 text-center">
                        {Array.from({ length: new Date(startYear, startMonth, 1).getDay() }).map((_, i) => (
                          <div key={`start-blank-${i}`} className="h-7 w-7" />
                        ))}
                        {Array.from({ length: new Date(startYear, startMonth + 1, 0).getDate() }, (_, i) => i + 1).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setStartDay(d)}
                            className={`h-7 w-7 text-xs rounded-full flex items-center justify-center mx-auto transition-all cursor-pointer ${
                              d === startDay
                                ? 'bg-primary text-white font-bold shadow-xs'
                                : 'text-slate-800 hover:bg-slate-100 font-normal'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* End Date Calendar Column */}
                    <div className="relative">
                      <h4 className="text-xs font-bold text-slate-800 text-center mb-3">End Date</h4>
                      
                      {/* Month & Year Navigation Header */}
                      <div className="flex items-center justify-between mb-3 px-1">
                        <button
                          type="button"
                          onClick={() => setShowEndPicker(!showEndPicker)}
                          className="font-extrabold text-xs text-slate-900 flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                        >
                          <span>{MONTH_SHORT[endMonth]} {endYear}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                        </button>

                        <div className="flex items-center gap-1">
                          <button 
                            type="button" 
                            onClick={handlePrevEndMonth}
                            className="p-1 hover:bg-slate-100 rounded text-slate-700 hover:text-black transition-colors cursor-pointer"
                            title="Previous Month"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button 
                            type="button" 
                            onClick={handleNextEndMonth}
                            className="p-1 hover:bg-slate-100 rounded text-slate-700 hover:text-black transition-colors cursor-pointer"
                            title="Next Month"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Month & Year Quick Selector Popover for End Date */}
                      {showEndPicker && (
                        <div className="absolute top-12 left-0 z-50 bg-white border border-slate-300 shadow-xl rounded-xl p-3 w-56 font-sans">
                          <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Select Month & Year</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEndYear(prev => prev - 1)}
                                className="text-xs px-1.5 py-0.5 hover:bg-slate-100 rounded font-bold"
                              >
                                ‹
                              </button>
                              <span className="text-xs font-bold text-slate-900">{endYear}</span>
                              <button
                                type="button"
                                onClick={() => setEndYear(prev => prev + 1)}
                                className="text-xs px-1.5 py-0.5 hover:bg-slate-100 rounded font-bold"
                              >
                                ›
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {MONTH_SHORT.map((mName, mIdx) => (
                              <button
                                key={mName}
                                type="button"
                                onClick={() => {
                                  setEndMonth(mIdx);
                                  setShowEndPicker(false);
                                }}
                                className={`py-1 text-[11px] rounded font-semibold transition-colors cursor-pointer ${
                                  mIdx === endMonth
                                    ? 'bg-primary text-white font-bold'
                                    : 'text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {mName}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Day of Week Headers */}
                      <div className="grid grid-cols-7 text-center mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dh, i) => (
                          <span key={i} className="text-[11px] font-semibold text-slate-400">
                            {dh}
                          </span>
                        ))}
                      </div>

                      {/* Dynamic Days Grid */}
                      <div className="grid grid-cols-7 gap-y-1.5 text-center">
                        {Array.from({ length: new Date(endYear, endMonth, 1).getDay() }).map((_, i) => (
                          <div key={`end-blank-${i}`} className="h-7 w-7" />
                        ))}
                        {Array.from({ length: new Date(endYear, endMonth + 1, 0).getDate() }, (_, i) => i + 1).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setEndDay(d)}
                            className={`h-7 w-7 text-xs rounded-full flex items-center justify-center mx-auto transition-all cursor-pointer ${
                              d === endDay
                                ? 'bg-primary text-white font-bold shadow-xs'
                                : 'text-slate-800 hover:bg-slate-100 font-normal'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Action Footer Buttons (Cancel & Apply) */}
                  <div className="flex justify-end items-center gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(false)}
                      className="text-slate-600 hover:text-slate-900 font-semibold text-xs px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyDateRange}
                      className="bg-primary hover:bg-primary-hover text-white font-bold text-xs px-5 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Main Table Container: Expanded Width & Crisp Alignment */}
          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-300 shadow-2xs bg-white">
            <table className="w-full text-left border-collapse font-sans text-xs">
              
              {/* Table Header: Column Names & Dynamic Dates / Weeks / Months */}
              <thead>
                <tr className="bg-[#2d3748] text-white font-bold text-[11px] tracking-wider font-sans">
                  <th className="py-3 px-3.5 border border-slate-600 w-32 sm:w-36 text-center bg-[#2d3748] text-white">
                    Particulars
                  </th>
                  <th className="py-3 px-3.5 border border-slate-600 w-60 min-w-[220px] bg-[#2d3748] text-white">
                    metric_name
                  </th>
                  {activeDates.map((d) => (
                    <th key={d} className="py-3 px-3 border border-slate-600 text-center min-w-[110px] font-mono text-white text-[11px]">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* 1. ASSETS SECTION (Pale Tan/Gold Theme: Left #d4be72, Rows #f5e7b5) */}
                {activeAssetsData.map((row, idx) => (
                  <tr key={row.metric} className="bg-[#f5e7b5] hover:bg-[#ebd99d] transition-colors border-b border-amber-300/80 text-black font-semibold">
                    {idx === 0 && (
                      <td 
                        rowSpan={activeAssetsData.length} 
                        className="py-3 px-3 font-black text-center align-middle bg-[#d4be72] text-black border-r border-b border-amber-400 text-xs font-sans"
                      >
                        Assets
                      </td>
                    )}
                    <td className="py-2.5 px-3.5 font-bold border-r border-amber-300/80 text-black font-sans">{row.metric}</td>
                    {activeDates.map((d, vIdx) => (
                      <td key={d} className="py-2.5 px-3 text-right font-mono tabular-nums border-r border-amber-300/60 text-black">
                        {row.values[vIdx] !== undefined ? row.values[vIdx] : (row.values[row.values.length - 1] || '0')}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* 2. TRIPS SECTION (Mustard Gold Theme: Left #d99e00, Rows #f0c832) */}
                {activeTripsData.map((row, idx) => (
                  <tr key={row.metric} className="bg-[#f0c832] hover:bg-[#e0b822] transition-colors border-b border-amber-400 text-black font-bold">
                    {idx === 0 && (
                      <td 
                        rowSpan={activeTripsData.length} 
                        className="py-3 px-3 font-black text-center align-middle bg-[#d99e00] text-black border-r border-b border-amber-500 text-xs font-sans"
                      >
                        Trips
                      </td>
                    )}
                    <td className="py-2.5 px-3.5 font-bold border-r border-amber-400 text-black font-sans">{row.metric}</td>
                    {activeDates.map((d, vIdx) => (
                      <td key={d} className="py-2.5 px-3 text-right font-mono tabular-nums border-r border-amber-400/70 text-black">
                        {row.values[vIdx] !== undefined ? row.values[vIdx] : (row.values[row.values.length - 1] || '0')}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* 3. REVENUE SECTION (Purple/Lavender Theme: Left #8c67ab, Rows #b194cb) */}
                {activeRevenueData.map((row, idx) => (
                  <tr key={row.metric} className="bg-[#b194cb] hover:bg-[#a182bd] transition-colors border-b border-purple-300 text-black font-semibold">
                    {idx === 0 && (
                      <td 
                        rowSpan={activeRevenueData.length} 
                        className="py-3 px-3 font-black text-center align-middle bg-[#8c67ab] text-black border-r border-b border-purple-400 text-xs font-sans"
                      >
                        Revenue
                      </td>
                    )}
                    <td className="py-2.5 px-3.5 font-bold border-r border-purple-300 text-black font-sans">{row.metric}</td>
                    {activeDates.map((d, vIdx) => (
                      <td key={d} className="py-2.5 px-3 text-right font-mono tabular-nums border-r border-purple-300/60 text-black">
                        {row.values[vIdx] !== undefined ? row.values[vIdx] : (row.values[row.values.length - 1] || '0')}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* 4. QUALITY METRICS SECTION (Coral Theme: Left #ba544f, Rows #dc7d78) */}
                {activeQualityData.map((row, idx) => (
                  <tr key={row.metric} className="bg-[#dc7d78] hover:bg-[#cc6c67] transition-colors border-b border-rose-300 text-black font-semibold">
                    {idx === 0 && (
                      <td 
                        rowSpan={activeQualityData.length} 
                        className="py-3 px-3 font-black text-center align-middle bg-[#ba544f] text-black border-r border-b border-rose-400 text-xs font-sans"
                      >
                        Quality Metrics
                      </td>
                    )}
                    <td className="py-2.5 px-3.5 font-bold border-r border-rose-300 text-black font-sans">{row.metric}</td>
                    {activeDates.map((d, vIdx) => (
                      <td key={d} className="py-2.5 px-3 text-right font-mono tabular-nums border-r border-rose-200/60 text-black">
                        {row.values[vIdx] !== undefined ? row.values[vIdx] : (row.values[row.values.length - 1] || '0')}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* 5. DEAD MILES SECTION (Soft Pink Theme: Left #f2a7b5, Rows #ffeef2) */}
                {activeDeadMilesData.map((row, idx) => (
                  <tr key={row.metric} className="bg-[#ffeef2] hover:bg-[#fcd0da] transition-colors border-b border-pink-200 text-black font-semibold">
                    {idx === 0 && (
                      <td 
                        rowSpan={activeDeadMilesData.length} 
                        className="py-3 px-3 font-black text-center align-middle bg-[#f2a7b5] text-black border-r border-b border-pink-300 text-xs font-sans"
                      >
                        Dead Miles
                      </td>
                    )}
                    <td className="py-2.5 px-3.5 font-bold border-r border-pink-200 text-black font-sans">{row.metric}</td>
                    {activeDates.map((d, vIdx) => (
                      <td key={d} className="py-2.5 px-3 text-right font-mono tabular-nums border-r border-pink-200/80 text-black">
                        {row.values[vIdx] !== undefined ? row.values[vIdx] : (row.values[row.values.length - 1] || '0')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer Info */}
          <div className="mt-3.5 flex justify-end items-center text-[11px] text-slate-500 font-semibold px-1 font-sans">
            <span>Displaying {activeDates.length} Columns · {granularity} View</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-primary py-6 text-center text-xs text-white border-t border-primary-hover font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <img 
            src="/letzryd_logo.png" 
            alt="LetzRyd" 
            className="h-9 w-auto object-contain brightness-0 invert" 
          />
          <span className="font-semibold text-white/95">LetzRyd © Copyright 2026 | All Rights Reserved</span>
        </div>
      </footer>
    </div>
  );
}
