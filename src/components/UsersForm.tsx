import React, { useState, useEffect } from "react";
import { 
  Users, ArrowLeft, Search, UserPlus, ShieldAlert, CheckCircle, 
  RefreshCw, ChevronLeft, ShieldCheck, Lock, CheckSquare, Square, 
  MapPin, Briefcase, Mail, Key, User, Eye, EyeOff, X, Filter
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

// Operational Forms & Dashboards (grouped cleanly)
const OPERATIONAL_FORMS = [
  { key: "walkin",              label: "Walk-in & Leads" },
  { key: "onboarding",          label: "Partner Onboarding" },
  { key: "allocation",          label: "Vehicle Allocation" },
  { key: "dropoff",             label: "Vehicle Drop-Off" },
  { key: "adjustment",          label: "Adjustment" },
  { key: "rents",               label: "Rent Plans" },
  { key: "expenses",            label: "Expenses" },
  { key: "vehicle_onboarding",  label: "Vehicle Onboarding" },
  { key: "maintenance_in",      label: "Maintenance In" },
  { key: "maintenance_out",     label: "Maintenance Out" },
  { key: "workshops",           label: "Workshops" },
  { key: "hubs_parking",        label: "Hubs & Parking" },
  { key: "accident",            label: "Accidents" },
  { key: "inspection",          label: "Inspection" },
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
    name: "Fleet & Maintenance",
    forms: ["maintenance_in", "maintenance_out", "workshops", "accident", "inspection"]
  },
  {
    name: "Finance Desk",
    forms: ["adjustment", "rents", "expenses", "challans"]
  }
];

export default function UsersForm({ user, onBackToSelector, onLogout }: UsersFormProps) {
  // Modal State for "Add New User"
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  // User List & Permissions State
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
        setName("");
        setEmail("");
        setPassword("123456");
        setSelectedForms(["walkin", "onboarding", "allocation", "dropoff", "adjustment"]);
        setIsCreateModalOpen(false);
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

          {/* Prominent Action Button: Add New User */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green hover:bg-green-600 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add New User</span>
            </button>

            <span className="hidden sm:inline h-5 border-l border-border" />

            {/* Profile Avatar */}
            <div className="flex items-center gap-2">
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
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6">
        
        {/* TOP HERO BAR */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-green" />
              Team Members &amp; Form Access Matrix
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Select which operational forms each team member can view and use. Click <strong>Save</strong> on any row to apply changes immediately.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green hover:bg-green-600 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add New User</span>
          </button>
        </div>

        {/* MATRIX TABLE CONTAINER */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Table Filter Toolbar */}
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

          {/* Clean Interactive Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/80 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  <th className="px-5 py-3.5 min-w-[200px]">Team Member</th>
                  <th className="px-4 py-3.5 min-w-[130px]">City &amp; Role</th>
                  <th className="px-4 py-3.5 min-w-[500px]">Form Access Permissions (Click to Toggle)</th>
                  <th className="px-4 py-3.5 text-right min-w-[110px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      No team members found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map(r => {
                    const isSaving = savingUserId === r.id;
                    const userForms = r.forms || [];

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Member */}
                        <td className="px-5 py-4 align-top">
                          <div className="font-bold text-slate-900 leading-snug text-xs">{r.name || r.username}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{r.email || r.username}</div>
                        </td>

                        {/* City & Role */}
                        <td className="px-4 py-4 align-top">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-800 block">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {r.city || "—"}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                            {r.role || "Executive"}
                          </span>
                        </td>

                        {/* Forms */}
                        <td className="px-4 py-4 align-top">
                          {r.is_protected ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Protected Leadership Account — Permissions cannot be altered</span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {OPERATIONAL_FORMS.map(m => {
                                const isAllowed = userForms.includes(m.key);
                                return (
                                  <button
                                    key={m.key}
                                    type="button"
                                    onClick={() => handleToggleFormForUser(r.id, m.key)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                                      isAllowed
                                        ? "bg-green-50 border-green text-green shadow-2xs font-extrabold"
                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                    }`}
                                    title={`Toggle ${m.label}`}
                                  >
                                    {isAllowed ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-green" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 text-slate-300" />
                                    )}
                                    <span>{m.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-4 text-right align-top">
                          {r.is_protected ? (
                            <span className="text-[11px] font-bold text-slate-400 italic">Locked</span>
                          ) : (
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSaveUserPermissions(r)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-green hover:bg-green-600 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
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

          {/* Footer Info */}
          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3.5 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filteredRecords.length} team members</span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
              <ShieldAlert className="w-3.5 h-3.5" />
              Live immediate updates • Admin &amp; Leadership accounts protected
            </span>
          </div>
        </div>
      </main>

      {/* POPUP MODAL: ADD NEW USER */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center text-green">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Add New Team Member</h3>
                  <p className="text-[11px] text-slate-500">Create login account and assign form permissions immediately</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateUser} className="p-6 overflow-y-auto space-y-5">
              
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
                    Email / Login Username <span className="text-red-500">*</span>
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
                  <p className="text-[10px] text-slate-400 mt-1">Default set to 123456 (User can change after login)</p>
                </div>
              </div>

              {/* Form Access Checkboxes */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <span className="text-xs font-extrabold text-slate-900">Grant Form Permissions:</span>
                  
                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {PRESETS.map(p => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setSelectedForms(p.forms)}
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-green hover:text-white text-[10px] font-bold text-slate-700 transition-all cursor-pointer"
                      >
                        {p.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedForms(OPERATIONAL_FORMS.map(m => m.key))}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
                    >
                      All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                  {OPERATIONAL_FORMS.map(m => {
                    const isChecked = selectedForms.includes(m.key);
                    return (
                      <label 
                        key={m.key} 
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                          isChecked 
                            ? "bg-white border-green text-slate-900 shadow-2xs" 
                            : "bg-white/60 border-slate-200 text-slate-500 hover:bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCreateForm(m.key)}
                          className="h-4 w-4 rounded text-green focus:ring-green border-slate-300 cursor-pointer"
                        />
                        <span className="truncate text-[11px]">{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 h-11 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-2 h-11 bg-green hover:bg-green-600 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating Account...
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
        </div>
      )}
    </div>
  );
}
