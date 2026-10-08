import React, { useState, useMemo, useEffect } from "react";
import {
  ClipboardList, UserCheck, Settings, Key, LogOut, Truck, AlertTriangle,
  Wrench, MapPin, IndianRupee, Users, ShieldCheck, TicketIcon, UserCircle,
  Inbox, CheckCircle, BarChart3, Menu, X, Search
} from "lucide-react";
import { User } from "../types";

interface FormSelectorProps {
  user: User;
  initialSection?: "forms" | "dashboards";
  onSectionChange?: (section: "forms" | "dashboards") => void;
  onSelectForm: (form: "walkin" | "onboarding" | "operator_onboarding" | "adjustment" | "allocation" | "dropoff" | "expenses" | "vehicle_onboarding" | "workshops" | "hubs_parking" | "rents" | "accident" | "inspection" | "users" | "vehicle_models" | "cities" | "roles" | "tickets" | "employees" | "maintenance" | "maintenance_in" | "maintenance_out" | "challans" | "approvals" | "mis_dashboard") => void;
  onLogout: () => void;
}

// RBAC Configurations
const WRITE_ACCESS_ROLES = ["SA", "BH", "CM", "DM", "OB"];
const ALL_ROLES = ["SA", "BH", "CM", "DM", "OB", "SP"];

const CARDS = [
  { key: "walkin",              label: "Walkin & Leads Form",     sub: "Log walk-in visits",                  icon: ClipboardList, iconBg: "bg-green text-white",       iconColor: "text-white",       hover: "hover:border-green-500",  allowedRoles: ALL_ROLES, isCompleted: true },
  { key: "onboarding",          label: "Partner Onboarding",       sub: "Onboard driver & operator",           icon: UserCheck,     iconBg: "bg-green text-white",       iconColor: "text-white",       hover: "hover:border-green-500",  allowedRoles: WRITE_ACCESS_ROLES, isCompleted: true },
  { key: "vehicle_onboarding",  label: "Vehicle Onboarding",       sub: "Add vehicles to fleet",               icon: Truck,         iconBg: "bg-green text-white",       iconColor: "text-white",       hover: "hover:border-green-500",  allowedRoles: WRITE_ACCESS_ROLES, isCompleted: true },
  { key: "allocation",          label: "Vehicle Allocation Form",   sub: "Assign vehicle to driver",           icon: Key,           iconBg: "bg-green text-white",       iconColor: "text-white",       hover: "hover:border-green-500",  allowedRoles: ALL_ROLES, isCompleted: true },
  { key: "dropoff",             label: "Vehicle Drop-Off Form",     sub: "Record vehicle returns",              icon: Truck,         iconBg: "bg-amber-600 text-white",   iconColor: "text-white",       hover: "hover:border-amber-500",  allowedRoles: ALL_ROLES, isCompleted: true },
  { key: "maintenance_in",      label: "Maintenance In",           sub: "Vehicle check-in & inward",           icon: Wrench,        iconBg: "bg-indigo-600 text-white",  iconColor: "text-white",       hover: "hover:border-indigo-500", allowedRoles: ALL_ROLES, isCompleted: true },
  { key: "maintenance_out",     label: "Maintenance Out",          sub: "Vehicle check-out & billing",         icon: CheckCircle,   iconBg: "bg-emerald-600 text-white", iconColor: "text-white",       hover: "hover:border-emerald-500", allowedRoles: ALL_ROLES, isCompleted: true },
  { key: "adjustment",          label: "Adjustment Form",          sub: "Wallet adjustments",                  icon: Settings,      iconBg: "bg-green text-white",       iconColor: "text-white",       hover: "hover:border-green-500",  allowedRoles: ALL_ROLES, isCompleted: true },
  { key: "rents",               label: "Rent Plans",               sub: "Driver rent plans",                   icon: IndianRupee,   iconBg: "bg-green text-white",       iconColor: "text-white",       hover: "hover:border-green-500",  allowedRoles: ALL_ROLES, isCompleted: true },
  { key: "expenses",            label: "Expenses Form",            sub: "Record operational expenses",         icon: ClipboardList, iconBg: "bg-red-50",                 iconColor: "text-red-600",     hover: "hover:border-rose-500",   allowedRoles: ALL_ROLES },
  { key: "workshops",           label: "Workshops Form",           sub: "Garages & service vendors",           icon: Wrench,        iconBg: "bg-green-light",             iconColor: "text-green",       hover: "hover:border-green",      allowedRoles: ALL_ROLES },
  { key: "hubs_parking",        label: "Hubs & Parking",           sub: "Hubs & parking slots",                icon: MapPin,        iconBg: "bg-yellow-light",            iconColor: "text-amber-600",   hover: "hover:border-amber-500",  allowedRoles: ALL_ROLES },
  { key: "accident",            label: "Accidents Form",           sub: "Document vehicle accidents",          icon: AlertTriangle, iconBg: "bg-red-50",                 iconColor: "text-red-600",     hover: "hover:border-red-500",    allowedRoles: ALL_ROLES },
  { key: "inspection",          label: "Vehicle Inspection",       sub: "Log vehicle inspections",             icon: ClipboardList, iconBg: "bg-blue-50",                iconColor: "text-primary",     hover: "hover:border-primary",    allowedRoles: ALL_ROLES },
  { key: "users",               label: "Team & Form Access",        sub: "Add users & assign forms",            icon: Users,         iconBg: "bg-emerald-600 text-white", iconColor: "text-white",       hover: "hover:border-emerald-500", allowedRoles: ["SA", "BH", "CH", "GM"] },
  { key: "employees",           label: "Employees Desk",           sub: "LetzRyd team members",                icon: UserCircle,    iconBg: "bg-violet-50",              iconColor: "text-violet-600",  hover: "hover:border-violet-500", allowedRoles: ["SA", "BH"] },
  { key: "vehicle_models",      label: "Vehicle Models Desk",      sub: "Vehicle models registry",             icon: Truck,         iconBg: "bg-emerald-50",             iconColor: "text-emerald-600", hover: "hover:border-emerald-500", allowedRoles: ALL_ROLES },
  { key: "cities",              label: "Operating Cities",         sub: "Manage operating cities",             icon: MapPin,        iconBg: "bg-sky-50",                 iconColor: "text-sky-600",     hover: "hover:border-sky-500",    allowedRoles: ["SA", "BH", "CM"] },
  { key: "roles",               label: "Roles & Permissions",      sub: "Role access control",                 icon: ShieldCheck,   iconBg: "bg-indigo-50",              iconColor: "text-indigo-600",  hover: "hover:border-indigo-500", allowedRoles: ["SA"] },
  { key: "tickets",             label: "Tickets Desk",             sub: "Driver & team issues",                icon: TicketIcon,    iconBg: "bg-rose-50",                iconColor: "text-rose-600",    hover: "hover:border-rose-500",   allowedRoles: ALL_ROLES },
  { key: "maintenance",         label: "Maintenance Desk",         sub: "Service & maintenance",               icon: Wrench,        iconBg: "bg-indigo-50",              iconColor: "text-indigo-600",  hover: "hover:border-indigo-500", allowedRoles: ALL_ROLES },
  { key: "challans",            label: "Traffic Challans",         sub: "Log fines & challans",                icon: AlertTriangle, iconBg: "bg-red-50",                 iconColor: "text-red-600",     hover: "hover:border-red-500",    allowedRoles: ALL_ROLES },
] as const;

const DASHBOARD_CARDS = [
  {
    key: "mis_dashboard",
    label: "MIS Dashboard",
    sub: "Fleet & operational metrics",
    icon: BarChart3,
    iconBg: "bg-emerald-600 text-white",
    iconColor: "text-white",
    hover: "hover:border-emerald-600",
    isCompleted: true,
  },
] as const;

// RBAC Check for Executive MIS Dashboard Access
export const canAccessMISDashboard = (user: User): boolean => {
  const role = (user.role || "").toLowerCase();
  const roleCode = (user.role_code || "").toUpperCase();
  const username = (user.username || "").toLowerCase();

  // 1. SA & BH (Super Admin, Business Head)
  if (
    roleCode === "SA" || roleCode === "BH" || roleCode === "BH2" ||
    role.includes("admin") || role.includes("super admin") || role.includes("founder") || role.includes("ceo") ||
    role.includes("business head") || username === "admin" || username.startsWith("bh.")
  ) {
    return true;
  }

  // 2. CH & GM (CityHead, General Manager)
  if (
    roleCode === "CH" || roleCode === "GM" || roleCode === "GMO" ||
    role.includes("cityhead") || role.includes("general manager") || username.startsWith("ch.") || username.startsWith("gen_mgr")
  ) {
    return true;
  }

  // 3. FL (Finance Lead)
  if (
    roleCode === "FL" || role.includes("finance lead") || username.startsWith("fin_lead")
  ) {
    return true;
  }

  // 4. CM (City Manager)
  if (
    roleCode === "CM" || role.includes("city manager") || username.startsWith("city_mgr")
  ) {
    return true;
  }

  // 5. OPS MANAGER (OM)
  if (
    roleCode === "OM" || role.includes("ops manager") || role.includes("operations manager") || username.startsWith("om.")
  ) {
    return true;
  }

  // 6. FLEET & MAINTENANCE (FM, MC, ME)
  if (
    roleCode === "FM" || roleCode === "MC" || roleCode === "ME" ||
    role.includes("fleet manager") || role.includes("maintenance") || username.startsWith("fleet_mgr") || username.startsWith("maint_")
  ) {
    return true;
  }

  // 7. Explicit per-user override in allowed_forms
  if (user.allowed_forms && user.allowed_forms.includes("mis_dashboard")) {
    return true;
  }

  return false;
};

export default function FormSelector({ user, initialSection = "forms", onSectionChange, onSelectForm, onLogout }: FormSelectorProps) {
  const canAccessDashboards = useMemo(() => canAccessMISDashboard(user), [user]);

  // Navigation section: "forms" (default) or "dashboards"
  const [activeSection, setActiveSection] = useState<"forms" | "dashboards">(() => {
    return initialSection === "dashboards" ? "dashboards" : "forms";
  });

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);
  
  const handleSectionClick = (section: "forms" | "dashboards") => {
    setActiveSection(section);
    if (onSectionChange) onSectionChange(section);
  };
  
  // Left sidebar open/collapse state (open by default on desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  const displayName = user.name || user.username || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();

  // Filter accessible cards based on RBAC & user.allowed_forms
  const accessibleCards = useMemo(() => {
    return CARDS.filter(({ key }) => {
      const role = (user.role || "").toLowerCase();
      const roleCode = (user.role_code || "").toUpperCase();
      const username = (user.username || "").toLowerCase();
      const name = (user.name || "").toLowerCase();
      const isAdmin = role.includes("admin") || role.includes("founder") || role.includes("ceo") || role.includes("business head") || roleCode === "SA" || roleCode === "BH" || roleCode === "BH2" || username === "admin" || username.startsWith("bh.") || name.includes("admin");

      if (isAdmin) return true;
      if (key === "maintenance_in" || key === "maintenance_out") return true;

      // Mohan Kumar & Leadership access to user management
      const isMohanOrLeadership = username.includes("mohan") || username === "mohan@letzryd.com" || roleCode === "CH" || roleCode === "GM";
      if (key === "users" && isMohanOrLeadership) return true;

      if (user.allowed_forms && user.allowed_forms.length > 0) {
        if (key === "approvals") return true;
        return user.allowed_forms.includes(key);
      }

      const isOnboardingExec = roleCode === "OB" || roleCode === "OE" || role.includes("onboarding") || username.includes("onboarding");
      if (isOnboardingExec) {
        return ["walkin", "onboarding", "allocation", "dropoff"].includes(key);
      }
      return ["walkin", "onboarding", "vehicle_onboarding", "allocation", "dropoff"].includes(key);
    });
  }, [user]);

  // Search filtering
  const visibleCards = useMemo(() => {
    if (!searchQuery.trim()) return accessibleCards;
    return accessibleCards.filter((card) =>
      card.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.sub.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [accessibleCards, searchQuery]);

  const visibleDashboards = useMemo(() => {
    if (!canAccessDashboards) return [];
    if (!searchQuery.trim()) return DASHBOARD_CARDS;
    return DASHBOARD_CARDS.filter((card) =>
      card.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.sub.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [canAccessDashboards, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text font-sans">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-xs">
        <div className="flex h-16 w-full items-center justify-between px-3 sm:px-6 lg:px-8">
          
          {/* Left: Hamburger Button & Brand */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileDrawerOpen(!isMobileDrawerOpen);
                } else {
                  setIsSidebarOpen(!isSidebarOpen);
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
              title="Toggle sidebar"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src="/letzryd_icon.png" 
                alt="LetzRyd" 
                className="h-7 w-7 object-contain sm:hidden shrink-0"
              />
              <img 
                src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" 
                alt="LetzRyd logo" 
                className="hidden sm:block h-8 w-auto object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
              <span className="hidden h-5 border-l border-border sm:inline-block" />
              <span className="hidden font-sans text-xs font-semibold text-text-muted sm:inline-block">
                Fleet Portal
              </span>
            </div>
          </div>

          {/* Right: User Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => onSelectForm("approvals" as any)}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 sm:px-4 font-sans text-xs font-bold text-white hover:bg-primary-hover transition-colors shadow-xs cursor-pointer"
            >
              <Inbox className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Approvals &amp; Submissions</span>
              <span className="sm:hidden">Approvals</span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3 rounded-lg border border-border bg-bg/50 px-2 sm:px-3 py-1.5">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white shrink-0">
                {initials}
              </div>
              <div className="hidden md:flex flex-col">
                <span className="font-sans text-xs font-semibold text-text leading-tight">
                  {user.name || user.username}
                </span>
                <span className="font-mono text-[10px] text-text-muted mt-0.5 leading-none">
                  {user.role || "Executive"} · {user.executive_id || "-"}
                </span>
              </div>
            </div>

            <button 
              onClick={onLogout}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-2.5 sm:px-3 font-sans text-xs font-medium text-text-muted hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors shadow-xs cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container with Left Sidebar */}
      <div className="flex flex-grow w-full relative">
        
        {/* Mobile Backdrop */}
        {isMobileDrawerOpen && (
          <div 
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-2xs lg:hidden"
          />
        )}

        {/* Left Sidebar (Only 2 items: Forms and Dashboards) */}
        <aside
          className={`
            fixed lg:sticky top-16 z-50 lg:z-30 h-[calc(100vh-4rem)] bg-white border-r border-border transition-all duration-200 ease-in-out flex flex-col shrink-0 overflow-hidden
            ${isMobileDrawerOpen ? "translate-x-0 left-0 w-72 shadow-xl" : "-translate-x-full lg:translate-x-0"}
            ${isSidebarOpen ? "lg:w-72" : "lg:w-18"}
          `}
        >
          {/* Mobile Drawer Close Header */}
          <div className="flex items-center justify-between p-4 border-b border-border lg:hidden">
            <span className="font-sans text-sm font-bold text-slate-800">Menu</span>
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="p-1 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Section Navigation Items */}
          <div className={`flex flex-col gap-2 flex-grow ${isSidebarOpen ? "p-3 sm:p-4" : "p-2 items-center"}`}>
            
            {/* 1. Forms & Registration Section */}
            <button
              onClick={() => {
                handleSectionClick("forms");
                setIsMobileDrawerOpen(false);
              }}
              className={`
                flex items-center w-full rounded-xl transition-colors cursor-pointer
                ${isSidebarOpen ? "gap-3 p-3 text-left" : "justify-center p-2.5 mx-auto"}
                ${activeSection === "forms"
                  ? "bg-green-light text-green border-2 border-green/70 font-bold shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 border border-transparent font-medium"
                }
              `}
              title="Forms & Registration"
            >
              <div className={`
                flex h-9 w-9 items-center justify-center rounded-lg shrink-0
                ${activeSection === "forms" ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}
              `}>
                <ClipboardList className="h-5 w-5" />
              </div>
              
              {isSidebarOpen && (
                <div className="flex flex-col min-w-0">
                  <span className="font-sans text-sm font-bold whitespace-nowrap">
                    Forms &amp; Registration
                  </span>
                  <span className="font-sans text-[11px] text-slate-400 font-normal whitespace-nowrap mt-0.5">
                    Operational forms
                  </span>
                </div>
              )}
            </button>

            {/* 2. Dashboards & Analytics Section */}
            <button
              onClick={() => {
                handleSectionClick("dashboards");
                setIsMobileDrawerOpen(false);
              }}
                className={`
                  flex items-center w-full rounded-xl transition-colors cursor-pointer
                  ${isSidebarOpen ? "gap-3 p-3 text-left" : "justify-center p-2.5 mx-auto"}
                  ${activeSection === "dashboards"
                    ? "bg-green-light text-green border-2 border-green/70 font-bold shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 border border-transparent font-medium"
                  }
                `}
                title="Dashboards & Analytics"
              >
                <div className={`
                  flex h-9 w-9 items-center justify-center rounded-lg shrink-0
                  ${activeSection === "dashboards" ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}
                `}>
                  <BarChart3 className="h-5 w-5" />
                </div>
                
                {isSidebarOpen && (
                  <div className="flex flex-col min-w-0">
                    <span className="font-sans text-sm font-bold whitespace-nowrap">
                      Dashboards &amp; Analytics
                    </span>
                    <span className="font-sans text-[11px] text-slate-400 font-normal whitespace-nowrap mt-0.5">
                      MIS &amp; reports
                    </span>
                  </div>
                )}
              </button>

          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          
          {/* VIEW 1: FORMS & REGISTRATION */}
          {activeSection === "forms" && (
            <div>
              {/* Section Header with Search on Right */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    Forms &amp; Registration
                  </h1>
                  <p className="font-sans text-xs text-slate-500 mt-1">
                    Access operational forms, registries, and administrative tools.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search forms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-8 text-xs font-sans rounded-lg border border-border bg-white placeholder:text-slate-400 focus:border-primary focus:outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Form Selection Grid (Shows All Forms) */}
              {visibleCards.length === 0 ? (
                <div className="bg-white border border-border rounded-xl p-8 text-center">
                  <p className="text-xs text-slate-500">No forms found matching "{searchQuery}"</p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-2 text-xs font-bold text-primary hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {visibleCards.map(({ key, label, sub, icon: Icon, iconBg, iconColor, hover, isCompleted }) => {
                    const cardStyle = isCompleted
                      ? "bg-green-50/90 border-2 border-green-400 hover:border-green-600 shadow-xs hover:shadow-md cursor-pointer"
                      : `bg-white border-border ${hover} hover:shadow-md cursor-pointer`;

                    return (
                      <button
                        key={key}
                        onClick={() => onSelectForm(key as any)}
                        className={`group relative flex flex-col items-start gap-3 rounded-xl p-6 text-left transition-all duration-200 ${cardStyle}`}
                      >
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} ${iconColor} group-hover:scale-105 transition-transform duration-200 shadow-xs`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-grow">
                          <h3 className="font-sans text-sm font-bold text-slate-900 mb-1 leading-tight">{label}</h3>
                          <p className="font-sans text-xs text-slate-500 leading-snug">{sub}</p>
                        </div>
                        <span className={`absolute top-4 right-4 rounded-md px-2.5 py-1 text-[10px] font-extrabold ${isCompleted ? 'bg-green text-white shadow-xs' : 'bg-green-light text-green'}`}>
                          Live
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: DASHBOARDS & ANALYTICS */}
          {activeSection === "dashboards" && (
            <div>
              {/* Section Header with Search on Right */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Dashboards &amp; Analytics
                  </h1>
                  <p className="font-sans text-xs text-slate-500 mt-1">
                    Access operational dashboards, MIS reports, and executive analytics.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search dashboards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-8 text-xs font-sans rounded-lg border border-border bg-white placeholder:text-slate-400 focus:border-primary focus:outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dashboards Grid (Matching Form Card Box Design exactly) */}
              {visibleDashboards.length === 0 ? (
                <div className="bg-white border border-border rounded-xl p-8 text-center max-w-md mx-auto">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">
                    {searchQuery ? "No dashboards found" : "No Dashboards Available"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {searchQuery
                      ? `No dashboards found matching "${searchQuery}"`
                      : "You do not currently have access to any dashboards in this section. Please contact your administrator if you need access."}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-3 text-xs font-bold text-primary hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {visibleDashboards.map(({ key, label, sub, icon: Icon, iconBg, iconColor, hover, isCompleted }) => {
                    const cardStyle = isCompleted
                      ? "bg-green-50/90 border-2 border-green-400 hover:border-green-600 shadow-xs hover:shadow-md cursor-pointer"
                      : `bg-white border-border ${hover} hover:shadow-md cursor-pointer`;

                    return (
                      <button
                        key={key}
                        onClick={() => onSelectForm(key as any)}
                        className={`group relative flex flex-col items-start gap-3 rounded-xl p-6 text-left transition-all duration-200 ${cardStyle}`}
                      >
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} ${iconColor} group-hover:scale-105 transition-transform duration-200 shadow-xs`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-grow">
                          <h3 className="font-sans text-sm font-bold text-slate-900 mb-1 leading-tight">{label}</h3>
                          <p className="font-sans text-xs text-slate-500 leading-snug">{sub}</p>
                        </div>
                        <span className={`absolute top-4 right-4 rounded-md px-2.5 py-1 text-[10px] font-extrabold ${isCompleted ? 'bg-green text-white shadow-xs' : 'bg-green-light text-green'}`}>
                          Live
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className="bg-primary py-8 text-center text-xs text-white border-t border-primary-hover font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <img 
            src="/letzryd_logo.png" 
            alt="LetzRyd" 
            className="h-11 w-auto object-contain brightness-0 invert" 
          />
          <span className="font-semibold text-white">LetzRyd © Copyright 2026 | All Rights Reserved</span>
        </div>
      </footer>

    </div>
  );
}