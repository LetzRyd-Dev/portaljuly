import { compressImage } from "../utils/imageCompressor";
import React, { useState, useMemo } from "react";
import { 
  Calendar, MapPin, User, Phone, FileText, CheckCircle, 
  Clock, ArrowLeft, Download, Search, Trash2, Edit, Camera, 
  Upload, X, RefreshCw, AlertTriangle, ShieldCheck, Filter, Plus, ChevronLeft, ChevronRight, IndianRupee, Settings, DollarSign, Send, ArrowRight, ArrowUpDown
} from "lucide-react";
import { AdjustmentRecord, User as UserSession, CITIES } from "../types";
import CameraCapture from "./CameraCapture";

interface AdjustmentFormProps {
  user: UserSession;
  onBackToSelector: () => void;
  onLogout: () => void;
}

const CONTESTED_OPTIONS = ["Base Rent", "Tolls", "Penalties", "Vehicle Damage", "Device Deposit", "Others"];

export default function AdjustmentForm({ 
  user, 
  onBackToSelector, 
  onLogout
}: AdjustmentFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "registry">("form");
  const [formMode, setFormMode] = useState<"new" | "edit">("new");
  
  // Header clock state
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true
  }));

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // LetzRyd Document State Fields
  const [editingId, setEditingId] = useState<number | null>(null);
  const [cityName, setCityName] = useState("Hyderabad");
  const [partnerName, setPartnerName] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [driverId, setDriverId] = useState("");
  const [partnerNumber, setPartnerNumber] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  
  const getTodayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const generateHisaabWeeks = () => {
    const weeks = [];
    const now = new Date();
    for (let i = 0; i < 16; i++) {
      const targetDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const d = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      const year = d.getUTCFullYear();
      
      const monday = new Date(targetDate);
      const currentDay = monday.getDay();
      const diffToMonday = monday.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      monday.setDate(diffToMonday);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monStr = `${monthNames[monday.getMonth()]} ${String(monday.getDate()).padStart(2, '0')}`;
      const sunStr = `${monthNames[sunday.getMonth()]} ${String(sunday.getDate()).padStart(2, '0')}`;
      
      const weekCode = `HSB-${year}-W${String(weekNo).padStart(2, '0')}`;
      const label = `${weekCode} (${monStr} - ${sunStr}, ${year})`;
      weeks.push({ code: weekCode, label });
    }
    return weeks;
  };

  const [hisaabNumber, setHisaabNumber] = useState(generateHisaabWeeks()[0]?.code || "HSB-2026-W39");
  const [hisaabDate, setHisaabDate] = useState(getTodayIST());
  const [adjustmentLevel, setAdjustmentLevel] = useState<"Operator" | "Drive to Own" | "Individual Driver" | "LetzOwn">("Operator");
  const [adjustmentType, setAdjustmentType] = useState<"Rental Waiver" | "Penalty" | "Maintenance">("Rental Waiver");
  const [adjustmentSubType, setAdjustmentSubType] = useState("");
  const [adjustmentSubTypeOther, setAdjustmentSubTypeOther] = useState("");
  const [reasonForPenalty, setReasonForPenalty] = useState("");
  const [maintenanceId, setMaintenanceId] = useState("");
  const [adjustmentNature, setAdjustmentNature] = useState("Monetary");
  const [adjustmentDateMandatory, setAdjustmentDateMandatory] = useState(getTodayIST());
  const [adjustmentDateOptional, setAdjustmentDateOptional] = useState("");
  const [approvalDate, setApprovalDate] = useState("");
  const [enterAmount, setEnterAmount] = useState("");
  const [remittanceTowards, setRemittanceTowards] = useState("");
  const [adjustmentRelatedTo, setAdjustmentRelatedTo] = useState("");
  
  // Approvals & Proof
  const [severityLevel, setSeverityLevel] = useState("Low");
  const [costLevel, setCostLevel] = useState("Minor (<₹1k)");
  const [escalateTo, setEscalateTo] = useState("");
  const [approver1Id, setApprover1Id] = useState("");
  const [approver1Name, setApprover1Name] = useState("");
  const [approver2Id, setApprover2Id] = useState("");
  const [approver2Name, setApprover2Name] = useState("");
  const [submitterComments, setSubmitterComments] = useState("");
  const [sentForApproval, setSentForApproval] = useState<"Yes" | "No">("Yes");
  const [approvalStatus, setApprovalStatus] = useState<string>("Draft");
  const [approversList, setApproversList] = useState<any[]>([]);
  const [approverSearchQuery, setApproverSearchQuery] = useState("");
  const [isApproverDropdownOpen, setIsApproverDropdownOpen] = useState(false);

  // Partial Approval & Review modal state
  const [reviewRecord, setReviewRecord] = useState<any | null>(null);
  const [approvedAmountInput, setApprovedAmountInput] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  const normCity = (s?: string) => {
    if (!s) return "";
    const v = s.trim().toLowerCase();
    if (["bangalore", "bengaluru", "blr"].includes(v)) return "bangalore";
    if (["hyderabad", "hyd"].includes(v)) return "hyderabad";
    if (["mumbai", "bom"].includes(v)) return "mumbai";
    if (["delhi", "del"].includes(v)) return "delhi";
    if (["chennai", "maa"].includes(v)) return "chennai";
    return v;
  };

  React.useEffect(() => {
    if (cityName && approversList.length > 0) {
      const target = normCity(cityName);
      const match = (target === "mumbai"
        ? approversList.find(a => normCity(a.city) === "mumbai" && (a.name?.toLowerCase().includes("tapan") || a.username?.toLowerCase().includes("tapan")))
        : null
      ) || approversList.find(a => normCity(a.city) === target && (a.role?.toLowerCase().includes("city manager") || a.role?.toLowerCase().includes("manager") || ["CM", "GM", "BH", "DM"].includes(a.role_code)))
        || approversList.find(a => normCity(a.city) === target);
      
      if (match) {
        setApprover1Id(String(match.id));
        setApprover1Name(match.name);
        setEscalateTo(String(match.id));
      }
    }
  }, [cityName, approversList]);

  const handleReviewStatusUpdate = async (action: "APPROVE" | "REJECT") => {
    if (!reviewRecord) return;
    try {
      setActionLoading(true);
      const token = localStorage.getItem("lr_token");
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      };
      const reqAmount = parseFloat(reviewRecord.enter_amount) || 0;
      const appAmount = parseFloat(approvedAmountInput) || 0;

      let targetStatus = "Approved";
      if (action === "REJECT") {
        targetStatus = "Rejected";
      } else if (appAmount < reqAmount) {
        targetStatus = "Partially Approved";
      }

      const res = await fetch(`/api/adjustment/${reviewRecord.id}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          status: targetStatus,
          approved_amount: action === "REJECT" ? "0" : approvedAmountInput
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update approval status");
      }

      alert(`Adjustment #${reviewRecord.id} updated to ${targetStatus} (Approved: ₹${action === "REJECT" ? 0 : approvedAmountInput})`);
      setReviewRecord(null);
      fetchData();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Dynamic Sub Point Options based on Feedback
  const SUB_TYPE_OPTIONS: Record<string, string[]> = {
    "Rental Waiver": [
      "App Issue",
      "Negative Balance",
      "Incentive Adjustment",
      "Dead Mile Waiver",
      "Temporary Leave",
      "Trip Mismatch",
      "Other"
    ],
    "Penalty": [
      "Penalty"
    ],
    "Maintenance": [
      "Accident Penalty",
      "Breakdown",
      "Vehicle Service",
      "Running Repair",
      "Vehicle Washing",
      "Traffic Fine",
      "Other"
    ]
  };

  React.useEffect(() => {
    const token = localStorage.getItem("lr_token");
    // Fetch all approvers list
    fetch("/api/july/approvers", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setApproversList(data); })
      .catch(() => {});

    // Fetch submitter's designated approval chain
    const uid = (user as any).portal_user_id || (user as any).id || (user as any).user_id;
    if (uid) {
      fetch(`/api/approval-chain/${uid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(chain => {
          if (Array.isArray(chain) && chain.length > 0) {
            const l1 = chain.find((c: any) => c.level === 1) || chain[0];
            const l2 = chain.find((c: any) => c.level === 2);
            if (l1 && l1.approver_name) {
              setApprover1Id(String(l1.approver_id || ""));
              setApprover1Name(`${l1.approver_name} (${l1.approver_role_name || l1.approver_role_code})`);
              setEscalateTo(String(l1.approver_id || ""));
              setApproverSearchQuery(`${l1.approver_name} (${l1.approver_role_name || l1.approver_role_code})`);
            }
            if (l2 && l2.approver_name) {
              setApprover2Id(String(l2.approver_id || ""));
              setApprover2Name(`${l2.approver_name} (${l2.approver_role_name || l2.approver_role_code})`);
            }
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Legacy fields (kept in state for backend compatibility)
  const [financeTeamStatus, setFinanceTeamStatus] = useState<"Approved" | "Pending" | "Rejected">("Pending");
  const [status, setStatus] = useState<"Completed" | "Hold" | "Declined">("Hold");
  
  const [stats, setStats] = useState({
    total_adjustments: 0,
    total_amount: 0,
    approved_count: 0,
    completed_count: 0
  });

  // Proof Image State (Unlimited photos support)
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [photo3, setPhoto3] = useState<string | null>(null);
  const [photo4, setPhoto4] = useState<string | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [activePhotoSlot, setActivePhotoSlot] = useState<number>(1);

  // Registry Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterAdjType, setFilterAdjType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const PAGE_SIZE = 10;
  
  const getSubmissionTimestamp = (r: any): number => {
    const raw = r.approval_submitted_at || r.created_at || r.updated_at;
    if (!raw) return 0;
    try {
      let str = String(raw).trim();
      if (str.includes(" ") && !str.includes("T")) str = str.replace(" ", "T");
      if (!str.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(str)) str += "Z";
      const t = new Date(str).getTime();
      return isNaN(t) ? 0 : t;
    } catch {
      return 0;
    }
  };

  const getSubmissionTimeComponents = (r: any) => {
    const rawDate = r.approval_submitted_at || r.created_at || r.updated_at;
    if (!rawDate) return { date: "—", time: "" };
    try {
      let str = String(rawDate).trim();
      if (str.includes(" ") && !str.includes("T")) str = str.replace(" ", "T");
      if (!str.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(str)) str += "Z";
      const d = new Date(str);
      if (isNaN(d.getTime())) return { date: String(rawDate), time: "" };
      const date = d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata"
      });
      const time = d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata"
      }).toLowerCase();
      return { date, time };
    } catch {
      return { date: String(rawDate), time: "" };
    }
  };

  const [retrieveSearchInput, setRetrieveSearchInput] = useState("");

  const displayName = user.name || user.username || "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const [records, setRecords] = useState<AdjustmentRecord[]>([]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/adjustment/stats", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch("/api/adjustment", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error("Error fetching records:", err);
    }
  };

  React.useEffect(() => {
    fetchStats();
    fetchRecords();
  }, []);

  const handleSlotImageUpload = (slot: 1 | 2 | 3 | 4, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file).then((compressed) => {
        if (slot === 1) { setPhoto1(compressed); setPhoto(compressed); }
        else if (slot === 2) setPhoto2(compressed);
        else if (slot === 3) setPhoto3(compressed);
        else if (slot === 4) setPhoto4(compressed);
      }).catch((err) => alert('Photo upload failed: ' + (err?.message || 'Please check your connection and try again.')));
    }
  };

  const loadRecordForEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/adjustment/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Record not found");
      const data = await res.json();
      
      setEditingId(data.id);
      setCityName(data.city_name || "Hyderabad");
      setPartnerName(data.partner_name || "");
      setPartnerCode(data.partner_code || "");
      setDriverId(data.driver_id || "");
      setPartnerNumber(data.partner_number || "");
      setVehicleNumber(data.vehicle_number || "");
      
      setHisaabNumber(data.hisaab_number || "HSB-2026-W39");
      setHisaabDate(data.hisaab_date || getTodayIST());
      setAdjustmentLevel(data.adjustment_level || "Operator");
      setAdjustmentType(data.adjustment_type || "Rental Waiver");
      setAdjustmentSubType(data.adjustment_sub_type || "");
      setAdjustmentSubTypeOther(data.adjustment_sub_type_other || "");
      setReasonForPenalty(data.reason_for_penalty || "");
      setMaintenanceId(data.maintenance_id || "");
      setAdjustmentNature(data.adjustment_nature || "Monetary");
      setAdjustmentDateMandatory(data.adjustment_date_mandatory || data.adjustment_date || getTodayIST());
      setAdjustmentDateOptional(data.adjustment_date_optional || "");
      setApprovalDate(data.approval_date || "");
      setEnterAmount(data.enter_amount || "");
      setRemittanceTowards(data.remittance_towards || "");
      setAdjustmentRelatedTo(data.adjustment_related_to || "");

      setSeverityLevel(data.severity_level || "Low");
      setCostLevel(data.cost_level || "Minor (<₹1k)");
      setEscalateTo(data.escalate_to || "");
      setApprover1Id(data.approver_1_id || "");
      setApprover1Name(data.approver_1_name || "");
      setApprover2Id(data.approver_2_id || "");
      setApprover2Name(data.approver_2_name || "");
      setSubmitterComments(data.submitter_comments || data.remarks || "");
      setSentForApproval(data.sent_for_approval || "No");
      setApprovalStatus(data.approval_status || "Draft");

      setFinanceTeamStatus(data.finance_team_status || "Pending");
      setStatus(data.status || "Hold");
      setPhoto1(data.photo_1 || data.photo || null);
      setPhoto2(data.photo_2 || null);
      setPhoto3(data.photo_3 || null);
      setPhoto4(data.photo_4 || null);
      setPhoto(data.photo_1 || data.photo || null);
      try {
        if (data.additional_photos) {
          const parsed = typeof data.additional_photos === 'string' ? JSON.parse(data.additional_photos) : data.additional_photos;
          if (Array.isArray(parsed)) setAdditionalPhotos(parsed);
        }
      } catch (e) {}
      
      setFormMode("edit");
      setActiveTab("form");
      setRetrieveSearchInput("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormMode("new");
    setCityName("Hyderabad");
    setPartnerName("");
    setPartnerCode("");
    setDriverId("");
    setPartnerNumber("");
    setVehicleNumber("");
    
    setHisaabNumber("HSB-2026-W39");
    setHisaabDate(getTodayIST());
    setAdjustmentLevel("Operator");
    setAdjustmentType("Rental Waiver");
    setAdjustmentSubType("");
    setAdjustmentSubTypeOther("");
    setReasonForPenalty("");
    setMaintenanceId("");
    setAdjustmentNature("Monetary");
    setAdjustmentDateMandatory(getTodayIST());
    setAdjustmentDateOptional("");
    setApprovalDate("");
    setEnterAmount("");
    setRemittanceTowards("");
    setAdjustmentRelatedTo("");
    
    setSeverityLevel("Low");
    setCostLevel("Minor (<₹1k)");
    setEscalateTo("");
    setApprover1Id("");
    setApprover1Name("");
    setApprover2Id("");
    setApprover2Name("");
    setSubmitterComments("");
    setSentForApproval("No");
    setApprovalStatus("Draft");

    setFinanceTeamStatus("Pending");
    setStatus("Hold");
    setPhoto1(null);
    setPhoto2(null);
    setPhoto3(null);
    setPhoto4(null);
    setAdditionalPhotos([]);
    setPhoto(null);
  };

  const handleSaveAndSubmit = async (sendForApproval: boolean) => {
    if (!partnerName.trim()) {
      return alert("Please enter Partner / Driver Name");
    }

    if (adjustmentType === "Penalty" && !reasonForPenalty.trim()) {
      return alert("Please enter mandatory Reason for Penalty");
    }

    if (adjustmentType === "Maintenance" && !maintenanceId.trim()) {
      return alert("Please enter/link Maintenance Record / ID");
    }

    if (!enterAmount || parseFloat(enterAmount) <= 0) {
      return alert("Please enter a valid Amount for adjustment");
    }

    if (!adjustmentDateMandatory) {
      return alert("Please select Mandatory Adjustment Date");
    }

    if (sendForApproval) {
      if (!submitterComments.trim()) {
        return alert("Please enter Submitter Comments & Justification before submitting for approval.");
      }
      if (!approver1Id && !approver1Name) {
        return alert("Please select First Approver before submitting for approval.");
      }
    }

    const payload = {
      partner_name: partnerName.trim(),
      partner_code: partnerCode.trim(),
      driver_id: driverId.trim() || null,
      partner_number: partnerNumber.trim() || null,
      vehicle_number: vehicleNumber.trim() || null,
      city_name: cityName,
      partner_type: adjustmentLevel,
      adjustment_nature: adjustmentNature,
      time_duration: null,
      remittance_towards: remittanceTowards.trim() || null,
      adjustment_related_to: adjustmentRelatedTo.trim() || null,
      first_level_approval_by: user.name,
      finance_team_remarks: null,
      final_level_approval_by: null,

      adjustment_level: adjustmentLevel,
      hisaab_number: hisaabNumber.trim(),
      hisaab_date: hisaabDate,
      adjustment_type: adjustmentType,
      adjustment_sub_type: adjustmentSubType,
      adjustment_sub_type_other: adjustmentSubTypeOther.trim() || null,
      reason_for_penalty: reasonForPenalty.trim() || null,
      maintenance_id: maintenanceId.trim() || null,
      adjustment_date: adjustmentDateMandatory,
      adjustment_date_mandatory: adjustmentDateMandatory,
      adjustment_date_optional: adjustmentDateOptional || null,
      approval_date: approvalDate || null,
      enter_amount: enterAmount,
      
      severity_level: severityLevel,
      cost_level: costLevel,
      escalate_to: String(escalateTo || ""),
      approver_1_id: approver1Id,
      approver_1_name: approver1Name,
      approver_2_id: approver2Id,
      approver_2_name: approver2Name,
      submitter_comments: submitterComments.trim(),
      sent_for_approval: sendForApproval ? "Yes" : "No",
      remarks: submitterComments.trim(),

      finance_team_status: financeTeamStatus,
      status: status,
      photo: photo1 || photo || null,
      photo_1: photo1 || photo || null,
      photo_2: photo2 || null,
      photo_3: photo3 || null,
      photo_4: photo4 || null,
      additional_photos: additionalPhotos
    };

    try {
      const token = localStorage.getItem("lr_token");
      const url = editingId ? `/api/adjustment/${editingId}` : "/api/adjustment";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to save adjustment request");
      }

      const resData = await res.json();
      const targetId = editingId || resData.id;

      if (sendForApproval && targetId) {
        const sendRes = await fetch(`/api/adjustment/send-for-approval/${targetId}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!sendRes.ok) {
          const sendErr = await sendRes.json();
          throw new Error(sendErr.detail || "Saved as draft, but failed to send for approval");
        }
        alert("Hisaab adjustment submitted and sent for approval successfully.");
      } else {
        alert("Hisaab adjustment draft saved successfully.");
      }

      resetForm();
      fetchStats();
      fetchRecords();
      setActiveTab("registry");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveAndSubmit(true);
  };

  const handleDelete = async (id: number, partner: string) => {
    if (!confirm(`Are you sure you want to delete adjustment request for "${partner}"?`)) return;
    try {
      const token = localStorage.getItem("lr_token");
      const res = await fetch(`/api/adjustment/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete record");
      alert("Deleted successfully");
      fetchStats();
      fetchRecords();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendForApproval = async (id: number) => {
    try {
      const token = localStorage.getItem("lr_token");
      const sendRes = await fetch(`/api/adjustment/send-for-approval/${id}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!sendRes.ok) {
        const sendErr = await sendRes.json();
        throw new Error(sendErr.detail || "Failed to send for approval");
      }
      alert("Sent for approval successfully.");
      fetchStats();
      fetchRecords();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Filter and Search logic
  const filteredRecords = useMemo(() => {
    const list = records.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        r.partner_name?.toLowerCase().includes(q) ||
        r.partner_code?.toLowerCase().includes(q) ||
        r.hisaab_number?.toLowerCase().includes(q) ||
        r.driver_id?.toLowerCase().includes(q) ||
        r.city_name?.toLowerCase().includes(q) ||
        String(r.id).includes(q);

      const matchesCity = filterCity === "all" || r.city_name === filterCity;
      const matchesType = filterAdjType === "all" || r.adjustment_type === filterAdjType;
      
      const effAppStatus = (r.approval_status || "").trim();
      const effStatus = (r.status || "").trim();
      const matchesStatus = 
        filterStatus === "all" || 
        effStatus === filterStatus || 
        effAppStatus === filterStatus ||
        (filterStatus === "Partially Approved" && (effStatus === "Partially Approved" || effAppStatus === "Partially Approved")) ||
        (filterStatus === "Approved" && (effStatus === "Approved" || effAppStatus === "Approved" || effStatus === "Completed")) ||
        (filterStatus === "Pending" && (effStatus.includes("Pending") || effAppStatus.includes("Pending"))) ||
        (filterStatus === "Hold" && (effStatus === "Hold" || effStatus === "On Hold")) ||
        (filterStatus === "Rejected" && (effStatus === "Declined" || effStatus === "Rejected" || effAppStatus === "Rejected")) ||
        (filterStatus === "Draft" && (effStatus === "Draft" || effAppStatus === "Draft" || (!effAppStatus && effStatus === "Draft")));

      return matchesSearch && matchesCity && matchesType && matchesStatus;
    });

    return list.sort((a, b) => {
      const timeA = getSubmissionTimestamp(a);
      const timeB = getSubmissionTimestamp(b);
      if (timeA !== timeB) {
        return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
      }
      return sortOrder === "desc" ? b.id - a.id : a.id - b.id;
    });
  }, [records, searchQuery, filterCity, filterAdjType, filterStatus, sortOrder]);

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, currentPage]);

  // CSV Export
  const handleExportCSV = () => {
    if (records.length === 0) return alert("No data available to export");
    const headers = [
      "ID", "City", "Partner Name", "Partner Code", "Driver ID", "Vehicle No", 
      "Hisaab No", "Hisaab Date", "Adj Level", "Adj Type", "Sub Type", "Requested Amount", 
      "Approved Amount", "Submission Time", "Mandatory Date", "Optional Date", 
      "Approval Status", "Status"
    ];
    const rows = records.map(r => {
      const subTime = getSubmissionTimeComponents(r);
      const subTimeStr = subTime.time ? `${subTime.date} ${subTime.time}` : subTime.date;
      return [
        r.id,
        r.city_name,
        `"${r.partner_name || ""}"`,
        r.partner_code || "",
        r.driver_id || "",
        r.vehicle_number || "",
        r.hisaab_number || "",
        r.hisaab_date || "",
        r.adjustment_level,
        r.adjustment_type,
        r.adjustment_sub_type || "",
        r.enter_amount,
        r.approved_amount || "",
        `"${subTimeStr}"`,
        r.adjustment_date_mandatory || r.adjustment_date || "",
        r.adjustment_date_optional || "",
        r.approval_status || "Draft",
        r.status
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Hisaab_Adjustments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col font-sans antialiased text-text selection:bg-primary selection:text-white">
      
      {/* APP BAR HEADER */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur-md shadow-2xs">
        <div className="mx-auto flex h-16 max-w-[1550px] items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo & Navigation */}
          <div className="flex items-center gap-4">
            <button 
              onClick={onBackToSelector}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-text-muted hover:bg-bg hover:text-primary transition-all shadow-2xs cursor-pointer"
              title="Return to Application Selector"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <img 
              src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" 
              alt="LetzRyd Logo" 
              className="h-8 w-auto object-contain" 
            />

            <span className="hidden font-sans text-xs font-semibold text-text-muted sm:inline-block">
              Fleet Portal
            </span>
          </div>

          {/* Navigation Pills */}
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "form" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <FileText className="h-4 w-4" />
              Adjustment Form
            </button>
            <button
              onClick={() => {
                setActiveTab("registry");
                fetchStats();
                fetchRecords();
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${ activeTab === "registry" ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-text-muted hover:bg-slate-100 hover:text-primary" }`}
            >
              <Settings className="h-4 w-4" />
              Adjustment Registry
            </button>
          </nav>

          {/* Clock & User Profile */}
          <div className="hidden items-center gap-4 lg:flex">
            <div className="text-right">
              <span className="block text-[9px] font-bold text-text-dim">Current Time (IST)</span>
              <span className="font-sans text-xs font-bold text-primary tracking-tight">{currentTime}</span>
            </div>
            
            <span className="h-5 border-l border-border" />
            
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
                {initials}
              </div>
              <div className="flex flex-col">
                <span className="font-sans text-xs font-semibold leading-none text-text">{displayName}</span>
                {user.executive_id && <span className="font-mono text-[9px] text-text-muted mt-1 leading-none">ID: {user.executive_id}</span>}
              </div>
            </div>

            <span className="h-5 border-l border-border" />

            <button 
              onClick={onLogout}
              className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-2.5 font-sans text-xs font-medium text-text-muted hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-[1550px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === "form" ? (
          <div>
            {/* Form card header */}
            <div className="rounded-2xl border border-border bg-white shadow-xl overflow-hidden mb-10 transition-all">
              <div className="bg-primary text-white px-8 py-6 relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-hover via-primary to-primary opacity-60" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <img src="https://letzryd.com/replica-assets/letzryd-long-png-logo-Aq2o3DNOw1i2kBMB-7ab04eaa76.png" className="h-8 brightness-0 invert" alt="LetzRyd" referrerPolicy="no-referrer" />
                      <span className="px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white text-[10px] font-bold tracking-widest backdrop-blur-sm">
                        LetzRyd Desk
                      </span>
                    </div>
                    <h1 className="font-sans text-2xl font-bold tracking-tight text-white leading-tight">
                      {editingId ? `Edit Adjustment Record #${editingId}` : "Adjustment Form"}
                    </h1>
                  </div>

                  {/* Header Search bar */}
                  <div className="relative z-10 flex w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="relative flex w-full sm:w-72 items-center">
                      <Search className="absolute left-3 h-4 w-4 text-white/60" />
                      <input 
                        type="number" 
                        placeholder="Edit existing record (ID)..." 
                        value={retrieveSearchInput}
                        onChange={(e) => setRetrieveSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && retrieveSearchInput && loadRecordForEdit(parseInt(retrieveSearchInput))}
                        className="h-10 w-full rounded-l-xl border border-white/20 bg-white/10 py-2 pl-10 pr-3 text-sm text-white placeholder-white/50 backdrop-blur-md outline-none transition-all focus:border-white focus:bg-white/20 focus:ring-2 focus:ring-white/20"
                      />
                      <button 
                        type="button"
                        onClick={() => retrieveSearchInput && loadRecordForEdit(parseInt(retrieveSearchInput))}
                        className="h-10 rounded-r-xl border border-white/20 border-l-0 bg-white px-4 text-xs font-bold text-emerald-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Retrieve
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {editingId && (
                <div className="bg-yellow-50 px-8 py-3 border-b border-yellow-200 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-yellow-800 text-sm font-semibold">
                    <Edit className="h-4 w-4" />
                    Editing Adjustment Record #{editingId}
                  </div>
                  <button type="button" onClick={resetForm} className="text-xs text-yellow-700 hover:text-yellow-900 font-bold underline cursor-pointer">
                    Cancel Edit
                  </button>
                </div>
              )}

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-8 space-y-10">
                
                {/* 2 COLUMN GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  
                  {/* COLUMN 1: TARGET DETAILS */}
                  <div className="space-y-6">
                    <div className="border-b border-slate-200 pb-2.5">
                      <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">1</span>
                        Target &amp; Entity Details
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Adjustment Level <span className="text-red-500">*</span></label>
                          <select 
                            value={adjustmentLevel}
                            onChange={(e) => setAdjustmentLevel(e.target.value as any)}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer"
                          >
                            <option value="Operator">Operator</option>
                            <option value="Drive to Own">Drive to Own</option>
                            <option value="Individual Driver">Individual Driver</option>
                            <option value="LetzOwn">LetzOwn</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-sans text-xs font-medium text-slate-700 mb-1">City Name <span className="text-red-500">*</span></label>
                          <select 
                            value={cityName}
                            onChange={(e) => setCityName(e.target.value)}
                            required
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer"
                          >
                            {CITIES.map((c) => (
                              <option key={c.value} value={c.value}>{c.text}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Partner / Driver Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Enter full name..."
                          value={partnerName}
                          onChange={(e) => setPartnerName(e.target.value)}
                          required
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Partner Code / ID</label>
                          <input 
                            type="text" 
                            placeholder="Unique Partner ID..."
                            value={partnerCode}
                            onChange={(e) => setPartnerCode(e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Partner Contact Number</label>
                          <input 
                            type="tel" 
                            placeholder="Mobile phone..."
                            value={partnerNumber}
                            onChange={(e) => setPartnerNumber(e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Vehicle Number</label>
                          <input 
                            type="text" 
                            placeholder="e.g. TS09 EA 1111..."
                            value={vehicleNumber}
                            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs uppercase"
                          />
                        </div>

                        <div>
                          <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Hisaab Number / Week <span className="text-red-500">*</span></label>
                          <select 
                            value={hisaabNumber}
                            onChange={(e) => setHisaabNumber(e.target.value)}
                            required
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer font-mono"
                          >
                            {generateHisaabWeeks().map((w) => (
                              <option key={w.code} value={w.code}>{w.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* COLUMN 2: ADJUSTMENT DETAILS */}
                  <div className="space-y-6">
                    <div className="border-b border-slate-200 pb-2.5">
                      <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">2</span>
                        Adjustment Details &amp; Approval
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Adjustment Type <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["Rental Waiver", "Penalty", "Maintenance"] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                setAdjustmentType(type);
                                setAdjustmentSubType("");
                                setAdjustmentSubTypeOther("");
                              }}
                              className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer transition-all shadow-2xs ${
                                adjustmentType === type 
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20 font-bold' 
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">
                          Sub Point – {adjustmentType} Details <span className="text-red-500">*</span>
                        </label>
                        <select 
                          value={adjustmentSubType}
                          onChange={(e) => setAdjustmentSubType(e.target.value)}
                          required
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="">-- Select {adjustmentType} Sub-Category --</option>
                          {(SUB_TYPE_OPTIONS[adjustmentType] || []).map((sub) => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>

                      {/* Other Details Input if 'Other' selected */}
                      {adjustmentSubType === "Other" && (
                        <div>
                          <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Enter Details for Other <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            placeholder="Specify other reason/details..."
                            value={adjustmentSubTypeOther}
                            onChange={(e) => setAdjustmentSubTypeOther(e.target.value)}
                            required
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs"
                          />
                        </div>
                      )}

                      {/* Reason for Penalty */}
                      {adjustmentType === "Penalty" && (
                        <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200">
                          <label className="block font-sans text-xs font-bold text-rose-900 mb-1">Reason for Penalty <span className="text-red-500">*</span></label>
                          <textarea 
                            placeholder="Specify exact mandatory reason for issuing this penalty..."
                            value={reasonForPenalty}
                            onChange={(e) => setReasonForPenalty(e.target.value)}
                            required
                            rows={2}
                            className="w-full rounded-xl border border-rose-300 bg-white px-3 py-2 font-sans text-xs font-medium focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all shadow-2xs resize-none"
                          />
                        </div>
                      )}

                      {/* Maintenance Link */}
                      {adjustmentType === "Maintenance" && (
                        <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-1.5">
                          <label className="block font-sans text-xs font-bold text-amber-900 mb-1">Link Maintenance Record / ID <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            placeholder="e.g. MAINT-9012 or Select Maintenance Date..."
                            value={maintenanceId}
                            onChange={(e) => setMaintenanceId(e.target.value)}
                            required
                            className="w-full h-10 rounded-xl border border-amber-300 bg-white px-3 font-sans text-xs font-mono font-medium focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all shadow-2xs"
                          />
                          <p className="text-[10px] text-amber-700">Links directly to Maintenance module record to prevent duplicate entries.</p>
                        </div>
                      )}

                      {/* Amount Field (₹) */}
                      <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                        <label className="block font-sans text-xs font-medium text-slate-800 mb-1">Requested Amount (₹) <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <input 
                            type="number" 
                            placeholder="0.00"
                            value={enterAmount}
                            onChange={(e) => setEnterAmount(e.target.value)}
                            required
                            className="w-full pl-9 h-10 rounded-xl border border-slate-300 bg-white px-3 font-sans text-xs font-bold text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* 2 Clean Date Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Adjustment Date <span className="text-red-500">*</span></label>
                          <input 
                            type="date" 
                            value={adjustmentDateMandatory}
                            onChange={(e) => setAdjustmentDateMandatory(e.target.value)}
                            required
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block font-sans text-xs font-medium text-slate-700 mb-1">Application Date <span className="text-red-500">*</span></label>
                          <input 
                            type="date" 
                            value={hisaabDate}
                            onChange={(e) => setHisaabDate(e.target.value)}
                            required
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Submitter Comments & Justification */}
                      <div>
                        <label className="block font-sans text-xs font-medium text-slate-700 mb-1">
                          Submitter Comments &amp; Justification <span className="text-red-500">*</span>
                        </label>
                        <textarea 
                          placeholder="Provide detailed reason or justification for this adjustment request..."
                          value={submitterComments}
                          onChange={(e) => setSubmitterComments(e.target.value)}
                          required
                          rows={2}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs resize-none"
                        />
                      </div>

                      {/* Single Approver Selection */}
                      <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                        <label className="block font-sans text-xs font-medium text-slate-800 mb-1">
                          Select First Approver <span className="text-red-500">*</span>
                        </label>
                        <select 
                          value={approver1Id || approver1Name}
                          onChange={(e) => {
                            const val = e.target.value;
                            const sel = approversList.find(a => String(a.id) === val || a.name?.toLowerCase() === val.toLowerCase());
                            if (sel) {
                              setApprover1Id(String(sel.id));
                              setApprover1Name(sel.name);
                              setEscalateTo(String(sel.id));
                            } else {
                              setApprover1Id(val);
                              setApprover1Name(val);
                              setEscalateTo(val);
                            }
                          }}
                          required
                          className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 font-sans text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="">-- Select First Approver --</option>
                          {cityName && (
                            <optgroup label={`City Approvers (${cityName})`}>
                              {approversList
                                .filter(a => normCity(a.city) === normCity(cityName))
                                .map(a => (
                                  <option key={`city-${a.id}`} value={String(a.id)}>
                                    {a.name} ({a.role || 'City Manager'} - {a.city || cityName})
                                  </option>
                                ))}
                            </optgroup>
                          )}
                          <optgroup label="Primary Management">
                            {["Mohan Kumar", "Sarvagna", "Ravi"].map(name => {
                              const matchedUser = approversList.find(a => a.name?.toLowerCase().includes(name.toLowerCase()));
                              const idVal = matchedUser ? String(matchedUser.id) : name;
                              const displayName = matchedUser ? matchedUser.name : name;
                              const displayRole = matchedUser?.role || matchedUser?.email || 'Management';
                              const displayCity = matchedUser?.city ? ` - ${matchedUser.city}` : '';
                              return (
                                <option key={name} value={idVal}>
                                  {displayName} ({displayRole}{displayCity})
                                </option>
                              );
                            })}
                          </optgroup>
                          <optgroup label="Other Approvers">
                            {approversList
                              .filter(a => !cityName || normCity(a.city) !== normCity(cityName))
                              .filter(a => !["mohan", "sarvagna", "ravi"].some(k => a.name?.toLowerCase().includes(k)))
                              .map(a => (
                                <option key={a.id} value={String(a.id)}>
                                  {a.name} ({a.role || 'Approver'}{a.city ? ` - ${a.city}` : ''})
                                </option>
                              ))}
                          </optgroup>
                        </select>
                      </div>

                    </div>
                  </div>
                </div>

                {/* SECTION 3: Attachments & Proof (Unlimited Photos) */}
                <div className="border-t border-slate-200 pt-8">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 mb-6">
                    <div>
                      <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">3</span>
                        Attachments &amp; Proof (Unlimited Photos)
                      </h3>
                      <p className="font-sans text-xs text-slate-500 mt-1">Upload or capture receipts, bills, or proof photos related to this adjustment. No upload limit.</p>
                    </div>
                    <label className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer transition-colors">
                      <Plus className="h-4 w-4" />
                      Add Extra Photo
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            compressImage(file).then((img) => setAdditionalPhotos(prev => [...prev, img]));
                          }
                        }} 
                        className="hidden" 
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {([
                      { slot: 1, val: photo1, setVal: setPhoto1 },
                      { slot: 2, val: photo2, setVal: setPhoto2 },
                      { slot: 3, val: photo3, setVal: setPhoto3 },
                      { slot: 4, val: photo4, setVal: setPhoto4 }
                    ] as const).map(({ slot, val, setVal }) => (
                      <div key={slot} className="w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center hover:bg-slate-50 transition-all shadow-2xs flex flex-col items-center justify-between min-h-[160px]">
                        <span className="text-[10px] font-bold text-slate-500 uppercase mb-2">Photo {slot}</span>
                        {val ? (
                          <div className="relative inline-block w-full">
                            <img 
                              src={val} 
                              alt={`Proof ${slot}`} 
                              className="h-28 w-full object-cover rounded-xl border border-slate-200 shadow-xs"
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                setVal(null);
                                if (slot === 1) setPhoto(null);
                              }}
                              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white border border-white hover:bg-rose-700 shadow-xs cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3 w-full my-auto">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                              <Upload className="h-4 w-4" />
                            </div>
                            <p className="font-sans text-[11px] font-medium text-slate-500">No photo uploaded</p>
                            <div className="flex gap-2 justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePhotoSlot(slot);
                                  setCameraActive(true);
                                }}
                                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 font-sans text-[11px] font-medium text-white hover:bg-emerald-700 shadow-xs cursor-pointer transition-colors"
                              >
                                <Camera className="h-3 w-3" />
                                Camera
                              </button>
                              <label className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-sans text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs">
                                <Upload className="h-3 w-3 text-emerald-600" />
                                File
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={(e) => handleSlotImageUpload(slot, e)} 
                                  className="hidden" 
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Additional Unlimited Photos Grid */}
                    {additionalPhotos.map((img, idx) => (
                      <div key={`extra-${idx}`} className="w-full rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4 text-center transition-all shadow-2xs flex flex-col items-center justify-between min-h-[160px]">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase mb-2">Extra Photo #{idx + 5}</span>
                        <div className="relative inline-block w-full">
                          <img 
                            src={img} 
                            alt={`Extra Proof ${idx + 5}`} 
                            className="h-28 w-full object-cover rounded-xl border border-emerald-200 shadow-xs"
                          />
                          <button 
                            type="button"
                            onClick={() => setAdditionalPhotos(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white border border-white hover:bg-rose-700 shadow-xs cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FORM ACTIONS */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-slate-200 pt-6">
                  <div className="flex flex-col gap-1 text-left w-full sm:w-auto">
                    <p className="text-[11px] font-medium text-slate-500">* indicates mandatory field</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-end">
                    <button 
                      type="button"
                      onClick={() => handleSaveAndSubmit(false)}
                      className="h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 font-sans text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                    >
                      Save as Draft
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleSaveAndSubmit(true)}
                      className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 font-sans text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                    >
                      {editingId ? "Update Adjustment" : "Submit Adjustment"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 4 STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* CARD 1: Total Adjustments */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Adjustments</span>
                  <span className="font-sans text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight block mt-1">{stats.total_adjustments}</span>
                  <span className="font-sans text-[11px] text-slate-400 font-medium block mt-0.5">Requests processed</span>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
              </div>

              {/* CARD 2: Total Amount */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Amount</span>
                  <span className="font-sans text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight block mt-1">₹{stats.total_amount.toLocaleString("en-IN")}</span>
                  <span className="font-sans text-[11px] text-slate-400 font-medium block mt-0.5">Net adjustment value</span>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
                  <IndianRupee className="h-5 w-5" />
                </div>
              </div>

              {/* CARD 3: Approved Adjustments */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Approved Adjustments</span>
                  <span className="font-sans text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight block mt-1">{stats.approved_count}</span>
                  <span className="font-sans text-[11px] text-slate-400 font-medium block mt-0.5">Ready for settlement</span>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>

              {/* CARD 4: Completed Status */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Completed Status</span>
                  <span className="font-sans text-2xl sm:text-3xl font-extrabold text-indigo-600 tracking-tight block mt-1">{stats.completed_count}</span>
                  <span className="font-sans text-[11px] text-slate-400 font-medium block mt-0.5">Fully closed adjustments</span>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* TOP SEARCH & FILTER TOOLBAR CARD (EXACT ALLOCATION & WALKIN REGISTRY MATCH) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Search partner, code, Hisaab..." 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 font-sans text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none transition-all shadow-2xs"
                />
              </div>

              <div>
                <select 
                  value={filterCity}
                  onChange={(e) => { setFilterCity(e.target.value); setCurrentPage(1); }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-sans text-xs text-slate-700 focus:border-emerald-600 focus:outline-none transition-all shadow-2xs cursor-pointer"
                >
                  <option value="all">All Cities</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Delhi">Delhi</option>
                </select>
              </div>

              <div>
                <select 
                  value={filterAdjType}
                  onChange={(e) => { setFilterAdjType(e.target.value); setCurrentPage(1); }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-sans text-xs text-slate-700 focus:border-emerald-600 focus:outline-none transition-all shadow-2xs cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="Credit">Credit</option>
                  <option value="Debit">Debit</option>
                  <option value="Rental Waiver">Rental Waiver</option>
                  <option value="Waiver">Waiver</option>
                </select>
              </div>

              <div>
                <select 
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-sans text-xs text-slate-700 focus:border-emerald-600 focus:outline-none transition-all shadow-2xs cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Partially Approved">Partially Approved</option>
                  <option value="Pending">Pending Approval</option>
                  <option value="Hold">On Hold</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>

            {/* TABLE CARD */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              
              <div className="border-b border-slate-200 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-sans text-xl font-bold text-slate-900 tracking-tight">Adjustment Registry</h3>
                  <p className="font-sans text-xs text-slate-500 mt-1">Audit log of all adjustment requests, approval status, and proofs</p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={handleExportCSV}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 font-sans text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                  <button 
                    onClick={() => {
                      resetForm();
                      setActiveTab("form");
                    }}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 font-sans text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    Add Adjustment
                  </button>
                </div>
              </div>

              {/* TABLE CONTAINER */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3.5 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left w-14 whitespace-nowrap">ID</th>
                      <th className="px-3.5 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">Partner / Hisaab</th>
                      <th className="px-3.5 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">Adjustment Details</th>
                      <th className="px-3.5 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left whitespace-nowrap">Amount</th>
                      <th 
                        onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
                        className="px-3.5 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left cursor-pointer hover:bg-slate-100 transition-colors select-none whitespace-nowrap"
                        title="Click to sort by Submission Time"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Submission Time</span>
                          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                            {sortOrder === "desc" ? "Newest" : "Oldest"}
                          </span>
                        </div>
                      </th>
                      <th className="px-3.5 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left">Pending With</th>
                      <th className="px-3.5 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-left whitespace-nowrap">Status</th>
                      <th className="px-3.5 py-3.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center whitespace-nowrap w-44">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-sans text-xs bg-slate-50/50">
                          No matching adjustment records found in the database.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((r) => {
                        const rawStatus = r.status || "Draft";
                        const rawAppStatus = r.approval_status || "";
                        const isDraft = (rawStatus === "Draft" || rawAppStatus === "Draft") && !rawAppStatus.includes("Pending") && !rawAppStatus.includes("Approved");
                        const reqAmt = parseFloat(r.enter_amount) || 0;
                        const appAmt = r.approved_amount ? parseFloat(r.approved_amount) : reqAmt;
                        const isPartial = r.approved_amount && appAmt > 0 && appAmt < reqAmt;
                        const subTime = getSubmissionTimeComponents(r);

                        let finalStatus = "Draft";
                        let statusBadgeStyle = "bg-slate-100 text-slate-700 border-slate-200";

                        if (rawAppStatus === "Partially Approved" || rawStatus === "Partially Approved" || isPartial) {
                          finalStatus = "Partially Approved";
                          statusBadgeStyle = "bg-amber-50 text-amber-800 border-amber-300";
                        } else if (rawAppStatus === "Approved" || rawStatus === "Approved" || rawStatus === "Completed") {
                          finalStatus = "Approved";
                          statusBadgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-300";
                        } else if (rawAppStatus === "Rejected" || rawStatus === "Declined" || rawStatus === "Rejected") {
                          finalStatus = "Rejected";
                          statusBadgeStyle = "bg-rose-50 text-rose-800 border-rose-300";
                        } else if (rawStatus === "Hold" || rawStatus === "On Hold") {
                          finalStatus = "On Hold";
                          statusBadgeStyle = "bg-amber-50 text-amber-800 border-amber-300";
                        } else if (rawAppStatus.includes("Pending") || rawStatus === "Pending Approval") {
                          finalStatus = rawAppStatus || "Pending Approval";
                          statusBadgeStyle = "bg-amber-50 text-amber-700 border-amber-200/80";
                        } else {
                          finalStatus = "Draft";
                          statusBadgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
                        }

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3.5 py-3.5 font-sans text-xs font-semibold text-slate-700 whitespace-nowrap">#{r.id}</td>
                            <td className="px-3.5 py-3.5">
                              <div className="font-sans text-xs font-bold text-slate-900">{r.partner_name || "—"}</div>
                              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {r.partner_code ? `${r.partner_code} · ` : ''}{r.adjustment_level || 'Partner'}
                                {r.city_name ? ` (${r.city_name})` : ''}
                              </div>
                              {r.hisaab_number && (
                                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md mt-1 whitespace-nowrap">
                                  Hisaab: {r.hisaab_number}
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-3.5">
                              <span className={`inline-block rounded-md px-2 py-0.5 font-sans text-[11px] font-semibold border whitespace-nowrap ${
                                r.adjustment_type === "Credit" 
                                   ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                                   : r.adjustment_type === "Debit" 
                                   ? "bg-rose-50 text-rose-800 border-rose-200" 
                                   : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}>
                                {r.adjustment_type || "Adjustment"}
                              </span>
                              <div className="text-[11px] text-slate-600 font-medium mt-1">
                                {r.adjustment_reason || r.contested_item || (r.severity_level ? `Severity: ${r.severity_level}` : "Standard")}
                              </div>
                              {r.driver_id && (
                                <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                                  Driver ID: #{r.driver_id}
                                </div>
                              )}
                            </td>
                            <td className="px-3.5 py-3.5 whitespace-nowrap">
                              <div className="font-sans text-xs font-bold text-slate-900">
                                Requested: ₹{reqAmt.toLocaleString("en-IN")}
                              </div>
                              {(r.approved_amount || isPartial || finalStatus === "Approved" || finalStatus === "Partially Approved") && r.approved_amount && (
                                <div className="inline-flex items-center gap-1 font-sans text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md mt-0.5">
                                  Approved: ₹{parseFloat(r.approved_amount).toLocaleString("en-IN")}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400 font-medium mt-1">
                                Adj Date: {r.adjustment_date_mandatory || r.adjustment_date || "—"}
                              </div>
                            </td>
                            <td className="px-3.5 py-3.5 font-sans text-xs text-slate-800 whitespace-nowrap">
                              <span className="font-bold text-slate-900 block">{subTime.date}</span>
                              <span className="text-[10px] text-slate-400 font-medium block">{subTime.time || "—"}</span>
                            </td>
                            <td className="px-3.5 py-3.5">
                              {finalStatus === "Approved" || finalStatus === "Partially Approved" ? (
                                <div>
                                  <span className="font-sans text-xs font-bold text-slate-800 block">Completed</span>
                                  <span className="text-[10px] text-slate-400 font-medium block">Ready for settlement</span>
                                </div>
                              ) : r.approver_1_name || r.escalate_to || r.current_approver_name ? (
                                <div>
                                  <span className="font-sans text-xs font-bold text-slate-800 block">
                                    {r.approver_1_name || r.escalate_to || r.current_approver_name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium block">Assigned Approver</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs font-medium">—</span>
                              )}
                            </td>
                            <td className="px-3.5 py-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border font-semibold text-[11px] whitespace-nowrap ${statusBadgeStyle}`}>
                                {finalStatus}
                              </span>
                            </td>
                            <td className="px-3.5 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewRecord(r);
                                    setApprovedAmountInput(r.approved_amount || r.enter_amount);
                                  }}
                                  className="h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 font-sans text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                                  title="Review & Verify"
                                >
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                  Review
                                </button>
                                {isDraft && (
                                  <button
                                    type="button"
                                    onClick={() => handleSendForApproval(r.id)}
                                    className="h-7 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 font-sans text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                                    title="Send for Approval"
                                  >
                                    <Send className="h-3.5 w-3.5 text-blue-600" />
                                    Send
                                  </button>
                                )}
                                <button 
                                  type="button"
                                  onClick={() => loadRecordForEdit(r.id)}
                                  className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                                  title="Edit Adjustment"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDelete(r.id, r.partner_name)}
                                  className="h-7 w-7 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-rose-200/60"
                                  title="Delete Adjustment"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION FOOTER */}
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans text-xs text-slate-500">
                <span>
                  Showing {filteredRecords.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length} records
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer hover:bg-slate-100 transition-colors text-slate-600"
                  >
                    <ChevronLeft className="w-3 h-3" /> Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | string)[]>((acc, p, idx, arr) => {
                      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      typeof p === "string" ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-slate-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p as number)}
                          className={`h-8 w-8 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                            currentPage === p
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )
                  }
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || filteredRecords.length === 0}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer hover:bg-slate-100 transition-colors text-slate-600"
                  >
                    Next <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Camera Capture Modal */}
      {cameraActive && (
        <CameraCapture 
          onCapture={(base64) => {
            if (activePhotoSlot === 1) { setPhoto1(base64); setPhoto(base64); }
            else if (activePhotoSlot === 2) setPhoto2(base64);
            else if (activePhotoSlot === 3) setPhoto3(base64);
            else if (activePhotoSlot === 4) setPhoto4(base64);
            setCameraActive(false);
          }}
          onClose={() => setCameraActive(false)}
        />
      )}

      {/* Partial Approval Review Modal */}
      {reviewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Review Adjustment #{reviewRecord.id}</h3>
                <p className="text-[11px] text-slate-500">{reviewRecord.partner_name} · {reviewRecord.city_name || "City N/A"}</p>
              </div>
              <button 
                onClick={() => setReviewRecord(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl space-y-2 border border-slate-200 text-xs">
              <div className="flex justify-between">
                <span className="font-medium text-slate-600">Adjustment Type:</span>
                <span className="font-bold text-slate-800">{reviewRecord.adjustment_type} ({reviewRecord.adjustment_level})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-600">Requested Amount:</span>
                <span className="font-mono font-extrabold text-emerald-700 text-sm">₹{parseFloat(reviewRecord.enter_amount || 0).toLocaleString("en-IN")}</span>
              </div>
              {reviewRecord.remarks && (
                <div className="pt-2 border-t border-slate-200/60 text-slate-600 italic text-[11px]">
                  "{reviewRecord.remarks}"
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Approved Amount (₹) <span className="text-slate-500 font-normal">(Edit for partial approval)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-sm">₹</span>
                <input 
                  type="number"
                  value={approvedAmountInput}
                  onChange={(e) => setApprovedAmountInput(e.target.value)}
                  placeholder="Enter approved amount"
                  className="w-full h-10 pl-7 pr-4 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-emerald-600 shadow-xs"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-500 font-medium">Quick preset:</span>
                <button
                  type="button"
                  onClick={() => setApprovedAmountInput(reviewRecord.enter_amount)}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-mono text-[10px] font-bold border border-slate-200 cursor-pointer"
                >
                  Full (₹{reviewRecord.enter_amount})
                </button>
                <button
                  type="button"
                  onClick={() => setApprovedAmountInput(String(Math.round((parseFloat(reviewRecord.enter_amount || 0) / 2))))}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-mono text-[10px] font-bold border border-slate-200 cursor-pointer"
                >
                  Half (₹{Math.round((parseFloat(reviewRecord.enter_amount || 0) / 2))})
                </button>
              </div>

              {/* Status Preview */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">Outcome:</span>
                {parseFloat(approvedAmountInput || "0") <= 0 ? (
                  <span className="font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 text-[11px]">Rejected (₹0)</span>
                ) : parseFloat(approvedAmountInput || "0") < parseFloat(reviewRecord.enter_amount || "0") ? (
                  <span className="font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 text-[11px]">Partially Approved (₹{approvedAmountInput} of ₹{reviewRecord.enter_amount})</span>
                ) : (
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 text-[11px]">Fully Approved (₹{approvedAmountInput})</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewRecord(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReviewStatusUpdate("REJECT")}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => handleReviewStatusUpdate("APPROVE")}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {parseFloat(approvedAmountInput || "0") < parseFloat(reviewRecord.enter_amount || "0") ? "Approve Partial Amount" : "Approve Full Amount"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER SECTION */}
      <footer className="bg-primary py-8 text-center text-xs text-white border-t border-primary-hover font-sans mt-auto">
        <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
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