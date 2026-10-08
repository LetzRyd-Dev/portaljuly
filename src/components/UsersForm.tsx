import React, { useState, useEffect } from "react";
import { 
  Users, UserPlus, ShieldAlert, CheckCircle, RefreshCw, ChevronLeft, 
  ShieldCheck, Lock, CheckSquare, Square, MapPin, Search, Eye, EyeOff, 
  X, Sliders, ChevronRight
} from "lucide-react";
import { User as UserSession } from "../types";

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

// Operational Modules cleanly mapped with labels
const OPERATIONAL_FORMS = [
  { key: "walkin",              label: "Walk-in & Leads" },
  { key: "onboarding",          label: "Partner Onboarding" },
  { key: "allocation",          label: "Vehicle Allocation" },
  { key: "dropoff",             label: "Vehicle Drop-Off" },
  { key: "adjustment",          label: "Adjustment Form" },
  { key: "rents",               label: "Rent Plans" },
  { key: "expenses",            label: "Expenses Form" },
  { key: "vehicle_onboarding",  label: "Vehicle Onboarding" },
  { key: "maintenance_in",      label: "Maintenance In" },
  { key: "maintenance_out",     label: "Maintenance Out" },
  { key: "workshops",           label: "Workshops Form" },
  { key: "hubs_parking",        label: "Hubs & Parking" },
  { key: "accident",            label: "Accidents Form" },
  { key: "inspection",          label: "Vehicle Inspection" },
  { key: "challans",            label: "Traffic Challans" },
  { key: "tickets",             label: "Tickets Desk" },
  { key: "mis_dashboard",       label: "MIS Dashboard" },
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
    name: "Fleet & Service",
    forms: ["maintenance_in", "maintenance_out", "workshops", "accident", "inspection"]
  },
  {
    name: "Finance Desk",
    forms: ["adjustment", "rents", "expenses", "challans"]
  }
];

export default function UsersForm({ user, onBackToSelector, onLogout }: UsersFormProps) {
  // Default Tab: "create" (Add New User) as requested!
  const [activeTab, setActiveTab] = useState<"create" | "list">("create");

  // Create User Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Delhi");
  const [role, setRole] = useState("Driver Manager");
  const [roleId, setRoleId] = useState<number>(197); // 197 = DM
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedForms, setSelectedForms] = useState<string[]>([
    "walkin", "onboarding", "allocation", "dropoff", "adjustment"
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User List & Filter State
  const [records, setRecords] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("All");
  const [isLoading, setIsLoading] = useState(false);

  // Modal State for Editing Permissions of a specific user
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<AppUser | null>(null);
  const [modalSelectedForms, setModalSelectedForms] = useState<string[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

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

  const handleToggleCreateForm = (formKey: string) => {
    setSelectedForms(prev => 
      prev.includes(formKey) ? prev.filter(k => k !== formKey) : [...prev, formKey]
    );
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
        alert(`User account "${cleanEmail}" created successfully with form access!`);
        setName("");
        setEmail("");
        setPassword("123456");
        setSelectedForms(["walkin", "onboarding", "allocation", "dropoff", "adjustment"]);
        fetchRecords();
        setActiveTab("list");
      } else {
        alert(data.detail || "Failed to create user account");
      }
    } catch (err: any) {
      alert("Error occurred: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Permissions Modal
  const openEditPermissionsModal = (targetUser: AppUser) => {
    if (targetUser.is_protected) {
      return alert("Security policy: Admin and Leadership account permissions cannot be modified.");
    }
    setEditingPermissionsUser(targetUser);
    setModalSelectedForms(targetUser.forms || []);
  };

  const handleToggleModalForm = (formKey: string) => {
    setModalSelectedForms(prev => 
      prev.includes(formKey) ? prev.filter(k => k !== formKey) : [...prev, formKey]
    );
  };

  const handleSaveModalPermissions = async () => {
    if (!editingPermissionsUser) return;
    setIsSavingPermissions(true);
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/users/${editingPermissionsUser.id}/form-permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ forms: modalSelectedForms })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Permissions updated for ${editingPermissionsUser.name || editingPermissionsUser.username}!`);
        // Update local state
        setRecords(prev => prev.map(u => u.id === editingPermissionsUser.id ? { ...u, forms: modalSelectedForms } : u));
        setEditingPermissionsUser(null);
      } else {
        alert(data.detail || "Failed to update permissions");
      }
    } catch (err: any) {
      alert("Error saving permissions: " + err.message);
    } finally {
      setIsSavingPermissions(false);
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
              <span className="text-[10px] text-slate-500">Add users and manage form permissions</span>
            </div>
          </div>

          {/* Simple Clean Tabs: Add New User (Default) vs View Team List */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === "create"
                  ? "bg-green text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add New User</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === "list"
                  ? "bg-green text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>View Team &amp; Permissions</span>
            </button>
          </div>

          {/* Profile / Sign Out */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green text-xs font-bold text-white">
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

      {/* MAIN CONTENT AREA */}
      <main className="mx-auto max-w-5xl px-3 sm:px-6 lg:px-8 py-6">
        
        {/* VIEW 1: ADD NEW USER (DEFAULT OPENING) */}
        {activeTab === "create" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            
            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-green" />
                  Add New Team Member
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter candidate details and choose which forms they can see and use.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3 h-3" /> Direct Activation
              </span>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-6">
              
              {/* Profile Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shiva Kumar"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:border-green focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address / Login <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. shiva@letzryd.com"
                    value={email}
                    onChange={e => setEmail(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:border-green focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operating City <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:border-green focus:outline-none cursor-pointer"
                  >
                    <option value="Delhi">Delhi</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Chennai">Chennai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:border-green focus:outline-none cursor-pointer"
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

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full h-10 px-3 pr-10 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:border-green focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Default is 123456 (User can change upon logging in)</p>
                </div>
              </div>

              {/* Form Access Permissions Box */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">Form Access Checklist</span>
                    <span className="text-[11px] text-slate-500">Pick which forms this user will see on their dashboard</span>
                  </div>

                  {/* Preset Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Presets:</span>
                    {PRESETS.map(p => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setSelectedForms(p.forms)}
                        className="px-2 py-1 rounded-md bg-slate-100 hover:bg-green hover:text-white text-[10px] font-bold text-slate-700 transition-all cursor-pointer"
                      >
                        {p.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedForms(OPERATIONAL_FORMS.map(m => m.key))}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedForms([])}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  {OPERATIONAL_FORMS.map(m => {
                    const isChecked = selectedForms.includes(m.key);
                    return (
                      <label 
                        key={m.key} 
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                          isChecked 
                            ? "bg-white border-green text-slate-900 shadow-2xs font-extrabold" 
                            : "bg-white/60 border-slate-200 text-slate-500 hover:bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCreateForm(m.key)}
                          className="h-4 w-4 rounded text-green focus:ring-green border-slate-300 cursor-pointer"
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
                  className="w-full h-11 bg-green hover:bg-green-600 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating User Account...
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

        {/* VIEW 2: CLEAN, UNCLUTTERED USER LIST */}
        {activeTab === "list" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            
            {/* Filter Bar */}
            <div className="border-b border-slate-100 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Filter City:</span>
                <select
                  value={filterCity}
                  onChange={e => setFilterCity(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-green focus:outline-none cursor-pointer"
                >
                  <option value="All">All Cities</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Chennai">Chennai</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5 flex-1 max-w-md justify-end">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or role..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-green focus:outline-none"
                  />
                </div>

                <button
                  onClick={fetchRecords}
                  disabled={isLoading}
                  className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shrink-0"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Clean Table (Zero Horizontal Clutter) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/80 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Team Member</th>
                    <th className="px-4 py-3.5">City &amp; Designation</th>
                    <th className="px-4 py-3.5">Active Form Access</th>
                    <th className="px-4 py-3.5 text-right">Manage Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        No team members found.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map(r => {
                      const userForms = r.forms || [];

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Member info */}
                          <td className="px-5 py-4 align-middle">
                            <div className="font-bold text-slate-900 leading-snug">{r.name || r.username}</div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">{r.email || r.username}</div>
                          </td>

                          {/* City & Role */}
                          <td className="px-4 py-4 align-middle">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {r.city || "—"}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                              {r.role || "Executive"}
                            </span>
                          </td>

                          {/* Clean Form Access Badges Summary */}
                          <td className="px-4 py-4 align-middle">
                            {r.is_protected ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Lock className="w-3 h-3 text-amber-600" />
                                Protected Leadership Account
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-green-50 text-green border border-green/30">
                                  {userForms.length} Active {userForms.length === 1 ? "Form" : "Forms"}
                                </span>
                                <span className="text-[11px] text-slate-500 truncate max-w-xs">
                                  {userForms.length > 0 
                                    ? userForms.map(f => OPERATIONAL_FORMS.find(o => o.key === f)?.label || f).slice(0, 3).join(", ") + (userForms.length > 3 ? ` +${userForms.length - 3} more` : "")
                                    : "No forms assigned"}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Clean Action Button */}
                          <td className="px-4 py-4 text-right align-middle">
                            {r.is_protected ? (
                              <span className="text-[11px] font-bold text-slate-400 italic">Locked</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openEditPermissionsModal(r)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-green hover:text-white hover:border-green text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                <span>Edit Access</span>
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

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3.5 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredRecords.length} team members</span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                <ShieldAlert className="w-3.5 h-3.5" />
                Leadership accounts strictly protected from modifications
              </span>
            </div>
          </div>
        )}
      </main>

      {/* POPUP MODAL: EDIT USER PERMISSIONS (OPENED VIA "EDIT ACCESS" BUTTON) */}
      {editingPermissionsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Edit Form Access: {editingPermissionsUser.name || editingPermissionsUser.username}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {editingPermissionsUser.city} • {editingPermissionsUser.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPermissionsUser(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              
              <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700">Quick Presets:</span>
                <div className="flex flex-wrap gap-1">
                  {PRESETS.map(p => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setModalSelectedForms(p.forms)}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-green hover:text-white text-[10px] font-bold text-slate-700 transition-all cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setModalSelectedForms(OPERATIONAL_FORMS.map(m => m.key))}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalSelectedForms([])}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Checkboxes List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OPERATIONAL_FORMS.map(m => {
                  const isChecked = modalSelectedForms.includes(m.key);
                  return (
                    <label 
                      key={m.key} 
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                        isChecked 
                          ? "bg-green-50 border-green text-green shadow-2xs font-extrabold" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleModalForm(m.key)}
                        className="h-4 w-4 rounded text-green focus:ring-green border-slate-300 cursor-pointer"
                      />
                      <span className="truncate">{m.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditingPermissionsUser(null)}
                className="flex-1 h-10 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingPermissions}
                onClick={handleSaveModalPermissions}
                className="flex-2 h-10 bg-green hover:bg-green-600 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingPermissions ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving Permissions...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Save Permissions
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
