import React, { useState, useEffect } from "react";
import { 
  Users, ArrowLeft, Search, UserPlus, ShieldAlert, CheckCircle, 
  RefreshCw, ChevronLeft, ShieldCheck, Lock, CheckSquare, Square, 
  MapPin, Briefcase, Mail, Key, User, Eye, EyeOff
} from "lucide-react";
import { User as UserSession, CITIES } from "../types";

interface UsersFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

interface AppUser {
  id: number;
  username: string;
  name: string;
  role: string;
  role_id: number | null;
  role_code?: string;
  city?: string;
  email?: string;
  employee_id?: string;
  created_at: string | null;
  forms: string[];
  is_protected: boolean;
}

// Available Forms and Dashboards to assign
const AVAILABLE_MODULES = [
  { key: "walkin",              label: "Walkin & Leads Form",     category: "Operations" },
  { key: "onboarding",          label: "Partner Onboarding Form",  category: "Operations" },
  { key: "allocation",          label: "Vehicle Allocation Form", category: "Operations" },
  { key: "dropoff",             label: "Vehicle Drop-Off Form",   category: "Operations" },
  { key: "adjustment",          label: "Adjustment Form",         category: "Finance & Accounts" },
  { key: "vehicle_onboarding",  label: "Vehicle Onboarding Form", category: "Fleet" },
  { key: "rents",               label: "Rent Plans Form",         category: "Finance & Accounts" },
  { key: "expenses",            label: "Expenses Form",           category: "Finance & Accounts" },
  { key: "challans",            label: "Traffic Challans",        category: "Fleet" },
  { key: "maintenance_in",      label: "Maintenance In",          category: "Fleet & Service" },
  { key: "maintenance_out",     label: "Maintenance Out",         category: "Fleet & Service" },
  { key: "workshops",           label: "Workshops Form",          category: "Fleet & Service" },
  { key: "hubs_parking",        label: "Hubs & Parking Form",     category: "Fleet" },
  { key: "accident",            label: "Accidents Form",          category: "Fleet" },
  { key: "inspection",          label: "Vehicle Inspection",      category: "Fleet" },
  { key: "tickets",             label: "Tickets Desk",            category: "Operations" },
  { key: "mis_dashboard",       label: "MIS Dashboard",           category: "Dashboards & Analytics" },
];

const PRESETS = [
  {
    name: "Driver Manager (DM) Standard",
    forms: ["walkin", "onboarding", "allocation", "dropoff", "adjustment"]
  },
  {
    name: "Onboarding Executive",
    forms: ["walkin", "onboarding", "allocation"]
  },
  {
    name: "Fleet & Maintenance",
    forms: ["maintenance_in", "maintenance_out", "workshops", "accident", "inspection"]
  },
  {
    name: "Finance Desk",
    forms: ["adjustment", "rents", "expenses", "challans"]
  }
];

export default function UsersForm({ user, onBackToSelector, onLogout }: UsersFormProps) {
  const [activeTab, setActiveTab] = useState<"create" | "permissions">("permissions");

  // Create User Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Delhi");
  const [role, setRole] = useState("Driver Manager");
  const [roleId, setRoleId] = useState<number>(197); // default 197 = DM
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedForms, setSelectedForms] = useState<string[]>([
    "walkin", "onboarding", "allocation", "dropoff", "adjustment"
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Permissions Management State
  const [records, setRecords] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("All");
  const [isLoading, setIsLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);

  // Available Roles
  const [availableRoles, setAvailableRoles] = useState<Array<{ id: number; name: string; code?: string }>>([]);

  const displayName = user.name || user.username || "User";
  const initials = displayName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/roles", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableRoles(data);
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchRoles();
  }, []);

  const handleToggleFormForUser = (targetUserId: number, formKey: string) => {
    setRecords(prev => prev.map(u => {
      if (u.id !== targetUserId) return u;
      const current = u.forms || [];
      const updated = current.includes(formKey)
        ? current.filter(k => k !== formKey)
        : [...current, formKey];
      return { ...u, forms: updated };
    }));
  };

  const handleSaveUserPermissions = async (targetUser: AppUser) => {
    if (targetUser.is_protected) {
      return alert("Security policy: Admin and Leadership account permissions cannot be modified.");
    }
    setSavingUserId(targetUser.id);
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/users/${targetUser.id}/form-permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ forms: targetUser.forms || [] })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Permissions updated for ${targetUser.name || targetUser.username}!`);
      } else {
        alert(data.detail || "Failed to update permissions");
      }
    } catch (err: any) {
      alert("Error saving permissions: " + err.message);
    } finally {
      setSavingUserId(null);
    }
  };

  const handleToggleCreateForm = (formKey: string) => {
    setSelectedForms(prev => 
      prev.includes(formKey) ? prev.filter(k => k !== formKey) : [...prev, formKey]
    );
  };

  const handleApplyPreset = (presetForms: string[]) => {
    setSelectedForms(presetForms);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Full Name is required");
    if (!email.trim()) return alert("Email / Username is required");
    if (!password.trim()) return alert("Password is required");

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("lr_token");
      const cleanEmail = email.trim().toLowerCase();
      
      const payload = {
        name: name.trim(),
        username: cleanEmail,
        email: cleanEmail,
        password: password.trim(),
        role: role,
        role_id: roleId || null,
        city: city,
        forms: selectedForms
      };

      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        alert(`User account "${cleanEmail}" created successfully with assigned form permissions!`);
        // Reset form
        setName("");
        setEmail("");
        setPassword("123456");
        setSelectedForms(["walkin", "onboarding", "allocation", "dropoff", "adjustment"]);
        setActiveTab("permissions");
        fetchRecords();
      } else {
        alert(data.detail || "Failed to create user account");
      }
    } catch (err: any) {
      alert("Error occurred: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter users
  const filteredRecords = records.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.username && r.username.toLowerCase().includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.role && r.role.toLowerCase().includes(q))
    );
    const matchesCity = filterCity === "All" || (r.city && r.city.toLowerCase() === filterCity.toLowerCase());
    return matchesSearch && matchesCity;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button 
              type="button" 
              onClick={onBackToSelector}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer shrink-0"
              title="Back to Dashboard"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <img 
              src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" 
              alt="LetzRyd logo" 
              className="hidden sm:block h-7 w-auto object-contain cursor-pointer shrink-0"
              onClick={onBackToSelector}
              referrerPolicy="no-referrer"
            />
            <span className="hidden h-5 border-l border-border sm:inline-block" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 leading-tight">Team &amp; Form Access</span>
              <span className="text-[10px] text-slate-500">Manage team members and assigned form access</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("permissions")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "permissions" 
                  ? "bg-primary text-white shadow-xs" 
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Form Access List</span>
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "create" 
                  ? "bg-primary text-white shadow-xs" 
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New User</span>
            </button>
          </div>

          {/* User profile */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
              {initials}
            </div>
            <button 
              onClick={onLogout}
              className="hidden sm:flex h-8 items-center justify-center px-3 rounded-lg border border-border text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6">
        
        {/* VIEW 1: CREATE NEW USER */}
        {activeTab === "create" && (
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Add New Team Member</h2>
                <p className="text-xs text-slate-500 mt-0.5">Create portal credentials and immediately grant access to forms.</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3 h-3" /> No Approval Required
              </span>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-6">
              
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shiva Kumar"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email / Login Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. shiva@letzryd.com"
                    value={email}
                    onChange={e => setEmail(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Operating City <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-primary focus:outline-none cursor-pointer"
                  >
                    <option value="Delhi">Delhi</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Chennai">Chennai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Designation / Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={roleId}
                    onChange={e => {
                      const id = Number(e.target.value);
                      setRoleId(id);
                      const match = availableRoles.find(r => r.id === id);
                      if (match) setRole(match.name);
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-primary focus:outline-none cursor-pointer"
                  >
                    {availableRoles.length > 0 ? (
                      availableRoles
                        .filter(r => !["SA", "BH", "BH2"].includes(r.code || ""))
                        .map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))
                    ) : (
                      <>
                        <option value={197}>Driver Manager</option>
                        <option value={201}>Onboarding Executive</option>
                        <option value={198}>Ops Executive</option>
                        <option value={196}>City Manager</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Initial Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full h-10 px-3 pr-10 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Default set to 123456 (User can change after login)</p>
                </div>
              </div>

              {/* Form Access Permissions */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">Form Access Permissions</span>
                    <span className="text-[11px] text-slate-500">Select which forms this user is allowed to access and use</span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Presets:</span>
                    {PRESETS.map(p => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => handleApplyPreset(p.forms)}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-primary hover:text-white text-[10px] font-bold text-slate-700 transition-all cursor-pointer"
                      >
                        {p.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedForms(AVAILABLE_MODULES.map(m => m.key))}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedForms([])}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                  {AVAILABLE_MODULES.map(m => {
                    const isChecked = selectedForms.includes(m.key);
                    return (
                      <label 
                        key={m.key} 
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                          isChecked 
                            ? "bg-white border-primary/50 text-slate-900 shadow-2xs" 
                            : "bg-white/50 border-slate-200 text-slate-500 hover:bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCreateForm(m.key)}
                          className="h-4 w-4 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer"
                        />
                        <span className="truncate">{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating Account &amp; Setting Access...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create User &amp; Grant Access Immediately
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW 2: FORM ACCESS PERMISSIONS LIST */}
        {activeTab === "permissions" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Top Toolbar */}
            <div className="border-b border-slate-100 bg-slate-50/60 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Team Form Access Matrix</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Directly toggle form access for team members. Changes take effect immediately upon clicking Save.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* City Filter */}
                <select
                  value={filterCity}
                  onChange={e => setFilterCity(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-primary focus:outline-none cursor-pointer"
                >
                  <option value="All">All Cities</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Chennai">Chennai</option>
                </select>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or role..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Refresh */}
                <button
                  onClick={fetchRecords}
                  disabled={isLoading}
                  className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="px-5 py-3 min-w-[200px]">Team Member</th>
                    <th className="px-4 py-3 min-w-[120px]">City &amp; Role</th>
                    <th className="px-4 py-3 min-w-[480px]">Form Access Toggles</th>
                    <th className="px-4 py-3 text-right min-w-[110px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        No team members found matching search or filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map(r => {
                      const isSaving = savingUserId === r.id;
                      const userForms = r.forms || [];

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Member info */}
                          <td className="px-5 py-3.5 align-middle">
                            <div className="font-bold text-slate-900 leading-snug">{r.name || r.username}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{r.email || r.username}</div>
                          </td>

                          {/* City & Role */}
                          <td className="px-4 py-3.5 align-middle">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 block">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {r.city || "—"}
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              {r.role || "Executive"}
                            </span>
                          </td>

                          {/* Form Toggles */}
                          <td className="px-4 py-3.5 align-middle">
                            {r.is_protected ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                                <Lock className="w-3.5 h-3.5 text-amber-600" />
                                Protected Account — Admin / Leadership permissions cannot be modified
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {AVAILABLE_MODULES.map(m => {
                                  const isAllowed = userForms.includes(m.key);
                                  return (
                                    <button
                                      key={m.key}
                                      type="button"
                                      onClick={() => handleToggleFormForUser(r.id, m.key)}
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                        isAllowed
                                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                                          : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                      }`}
                                      title={m.label}
                                    >
                                      {isAllowed ? (
                                        <CheckSquare className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Square className="w-3 h-3 text-slate-300" />
                                      )}
                                      <span>{m.label.replace(" Form", "")}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-4 py-3.5 text-right align-middle">
                            {r.is_protected ? (
                              <span className="text-[11px] font-bold text-slate-400 italic">Locked</span>
                            ) : (
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleSaveUserPermissions(r)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                              >
                                {isSaving ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3.5 h-3.5" />
                                )}
                                <span>Save</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Summary */}
            <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredRecords.length} team members</span>
              <span className="flex items-center gap-1 text-[11px]">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                Live immediate updates • Admin &amp; Leadership accounts protected
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
