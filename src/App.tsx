import React, { useState, useEffect, useRef } from "react";
import { auth, db, signIn, logOut, handleFirestoreError, OperationType } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc, addDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { 
  Plus, 
  Camera, 
  Mic, 
  AlertTriangle, 
  QrCode, 
  Stethoscope, 
  LogOut, 
  Activity,
  Pill,
  Trash2,
  ChevronRight,
  Info,
  CheckCircle2,
  XCircle,
  FileText,
  Users,
  Clock,
  Search,
  Languages,
  ArrowLeft,
  Download,
  Share2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import ReactMarkdown from "react-markdown";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  addedAt: string;
}

interface UserProfile {
  name: string;
  bloodType: string;
  emergencyContact: string;
  emergencyPhone: string;
  conditions: string[];
  allergies: string[];
}

interface TriageResult {
  urgency: "EMERGENCY" | "URGENT" | "ROUTINE" | "MONITOR";
  likely_conditions: string[];
  immediate_actions: string[];
  reasoning: string;
  call_911: boolean;
}

interface InteractionResult {
  interactions: {
    drug_1: string;
    drug_2: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    risk: string;
    recommendation: string;
  }[];
  overall_risk: "HIGH" | "MEDIUM" | "LOW" | "NONE";
}

interface LabResult {
  findings: { test: string; value: string; status: string; explanation: string }[];
  summary: string;
  questions_for_doctor: string[];
}

interface PillResult {
  name: string;
  dosage: string;
  purpose: string;
  confidence: number;
  warnings: string[];
}

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  bloodType: string;
  emergencyContact: string;
  emergencyPhone: string;
  conditions: string[];
  allergies: string[];
  medications: Medication[];
}

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  variant = "primary", 
  className,
  disabled = false,
  size = "lg",
  type = "button"
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  type?: "button" | "submit" | "reset";
}) => {
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md",
    secondary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-md",
    outline: "border-2 border-slate-300 text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-500 hover:bg-slate-100"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base",
    md: "px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg",
    lg: "px-6 py-3 text-lg sm:px-8 sm:py-4 sm:text-xl font-semibold",
    xl: "px-8 py-4 text-xl sm:px-10 sm:py-6 sm:text-2xl font-bold"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={cn(
        "rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, title, subtitle }: { children: React.ReactNode; className?: string; title?: string; subtitle?: string }) => (
  <div className={cn("bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-8 shadow-sm border border-slate-100", className)}>
    {title && <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mb-1">{title}</h3>}
    {subtitle && <p className="text-base sm:text-lg text-slate-500 font-medium mb-4 sm:mb-6">{subtitle}</p>}
    {children}
  </div>
);

const Badge = ({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warning" | "danger" | "success" }) => {
  const variants = {
    info: "bg-blue-100 text-blue-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700",
    success: "bg-emerald-100 text-emerald-700"
  };
  return (
    <span className={cn("px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-widest", variants[variant])}>
      {children}
    </span>
  );
};

const MedicalDisclaimer = () => (
  <div className="p-8 bg-slate-100 rounded-[32px] text-slate-500 text-center space-y-2">
    <p className="text-lg font-bold">⚠️ Medical Disclaimer</p>
    <p className="text-base leading-relaxed">
      MediSense AI is an information tool and not a substitute for professional medical advice, diagnosis, or treatment. 
      Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. 
      <strong> In an emergency, call 911 immediately.</strong>
    </p>
  </div>
);

// --- Main App ---

type Tab = "home" | "scan" | "talk" | "check" | "sos" | "family";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [scanType, setScanType] = useState<"prescription" | "labs" | "pill" | null>(null);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [interactionResult, setInteractionResult] = useState<InteractionResult | null>(null);
  const [labResult, setLabResult] = useState<LabResult | null>(null);
  const [pillResult, setPillResult] = useState<PillResult | null>(null);
  const [translationResult, setTranslationResult] = useState<{ translated_text: string; original_text: string; language: string } | null>(null);
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [showAddFamily, setShowAddFamily] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubProfile = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        const initialProfile: UserProfile = {
          name: user.displayName || "Patient",
          bloodType: "Unknown",
          emergencyContact: "",
          emergencyPhone: "",
          conditions: [],
          allergies: []
        };
        setDoc(doc(db, "users", user.uid), initialProfile).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`));
      }
    });

    const unsubMeds = onSnapshot(query(collection(db, "users", user.uid, "medications"), orderBy("addedAt", "desc")), (snap) => {
      const meds = snap.docs.map(d => ({ id: d.id, ...d.data() } as Medication));
      setMedications(meds);
    });

    const unsubFamily = onSnapshot(collection(db, "users", user.uid, "family"), (snap) => {
      const members = snap.docs.map(d => ({ id: d.id, ...d.data() } as FamilyMember));
      setFamilyMembers(members);
    });

    return () => {
      unsubProfile();
      unsubMeds();
      unsubFamily();
    };
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "prescription" | "labs" | "pill") => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        let endpoint = "";
        if (type === "prescription") endpoint = "/api/ai/analyze-prescription";
        else if (type === "labs") endpoint = "/api/ai/analyze-lab-report";
        else if (type === "pill") endpoint = "/api/ai/identify-pill";

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 })
        });
        const data = await res.json();
        
        if (type === "prescription") {
          for (const med of data.medications) {
            await addDoc(collection(db, "users", user.uid, "medications"), {
              ...med,
              addedAt: new Date().toISOString()
            });
          }
          setActiveTab("home");
        } else if (type === "labs") {
          setLabResult(data);
        } else if (type === "pill") {
          setPillResult(data);
        }
        setIsAnalyzing(false);
      };
    } catch (error) {
      console.error(error);
      setIsAnalyzing(false);
    }
  };

  const handleVoiceHistory = async (text: string) => {
    if (!text || !user) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/ai/process-voice-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      
      // Update profile with conditions and allergies
      const updatedProfile = {
        ...profile!,
        conditions: Array.from(new Set([...(profile?.conditions || []), ...(data.conditions || [])])),
        allergies: Array.from(new Set([...(profile?.allergies || []), ...(data.allergies || [])]))
      };
      await setDoc(doc(db, "users", user.uid), updatedProfile).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`));

      // Add medications
      for (const med of (data.medications || [])) {
        await addDoc(collection(db, "users", user.uid, "medications"), {
          ...med,
          instructions: "Added via voice history",
          addedAt: new Date().toISOString()
        });
      }
      
      alert("Medical history updated successfully!");
      setActiveTab("home");
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTriage = async (symptoms: string) => {
    if (!symptoms) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms })
      });
      const data = await res.json();
      setTriageResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const checkInteractions = async () => {
    if (medications.length < 2) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/ai/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medications: medications.map(m => m.name) })
      });
      const data = await res.json();
      setInteractionResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTranslate = async (text: string, lang: string) => {
    if (!text) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, target_language: lang })
      });
      const data = await res.json();
      setTranslationResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSOS = () => {
    setIsSOSActive(true);
    // In a real app, this would trigger location sharing, SMS to emergency contacts, etc.
    setTimeout(() => {
      alert("EMERGENCY ALERT BROADCASTED: Your location and medical profile have been shared with emergency services and your contacts.");
      setIsSOSActive(false);
    }, 2000);
  };

  const addFamilyMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const newMember = {
      name: formData.get("name") as string,
      relation: formData.get("relation") as string,
      bloodType: formData.get("bloodType") as string,
      emergencyContact: formData.get("emergencyContact") as string,
      emergencyPhone: formData.get("emergencyPhone") as string,
      conditions: (formData.get("conditions") as string).split(",").map(c => c.trim()).filter(c => c),
      allergies: (formData.get("allergies") as string).split(",").map(a => a.trim()).filter(a => a),
      medications: []
    };
    
    try {
      await addDoc(collection(db, "users", user.uid, "family"), newMember);
      setShowAddFamily(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/family`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Activity size={64} className="text-emerald-600" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-8 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full bg-white rounded-[48px] p-12 shadow-2xl border-b-[12px] border-emerald-200"
        >
          <div className="bg-emerald-100 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-10">
            <Stethoscope size={64} className="text-emerald-600" />
          </div>
          <h1 className="text-5xl font-black text-slate-900 mb-6 tracking-tight">MediSense AI</h1>
          <p className="text-2xl text-slate-600 mb-12 leading-relaxed font-medium">
            Your medical companion for safe medication and emergency care.
          </p>
          <Button onClick={signIn} className="w-full" size="xl">
            Sign In with Google
          </Button>
          <p className="mt-10 text-sm text-slate-400 font-black uppercase tracking-[0.2em]">
            Secure • Private • Life-Saving
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-40">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="bg-emerald-600 p-2 sm:p-3 rounded-xl sm:rounded-2xl">
            <Stethoscope className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 leading-none">MediSense AI</h1>
            <p className="text-[10px] sm:text-sm font-bold text-emerald-600 uppercase tracking-widest mt-1">Patient Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={logOut} className="p-2 sm:p-4 hover:bg-rose-50 rounded-xl sm:rounded-2xl transition-colors text-rose-500">
            <LogOut className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-8">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black text-slate-900">My Medications</h2>
                <Button onClick={() => setActiveTab("scan")} size="md" variant="outline">
                  <Plus size={24} /> Add
                </Button>
              </div>

              {medications.length === 0 ? (
                <Card className="text-center py-20 border-dashed border-4 border-slate-200">
                  <Pill size={80} className="mx-auto text-slate-200 mb-8" />
                  <p className="text-2xl text-slate-500 font-bold">No medications listed yet.</p>
                  <Button onClick={() => setActiveTab("scan")} className="mt-10 mx-auto">
                    Scan New Prescription
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {medications.map((med) => (
                    <Card key={med.id} className="flex items-start justify-between group hover:border-emerald-200 transition-colors">
                      <div className="flex gap-6">
                        <div className="bg-indigo-100 p-5 rounded-[24px]">
                          <Pill size={40} className="text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-slate-800">{med.name}</h3>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="info">{med.dosage}</Badge>
                            <span className="text-xl text-slate-500 font-bold">•</span>
                            <span className="text-xl text-slate-500 font-bold">{med.frequency}</span>
                          </div>
                          <p className="text-lg text-slate-400 mt-3 italic font-medium leading-relaxed">
                            "{med.instructions}"
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteDoc(doc(db, "users", user.uid, "medications", med.id))}
                        className="p-4 text-slate-200 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={32} />
                      </button>
                    </Card>
                  ))}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-8">
                <Card title="Emergency Profile" subtitle="Critical info for paramedics" className="border-l-[12px] border-l-rose-500">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[24px]">
                      <span className="text-slate-400 font-black uppercase text-sm tracking-[0.2em]">Blood Type</span>
                      <span className="text-3xl font-black text-rose-600">{profile?.bloodType || "---"}</span>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-[24px]">
                      <span className="text-slate-400 font-black uppercase text-sm tracking-[0.2em] block mb-2">Emergency Contact</span>
                      <p className="text-2xl font-black text-slate-800">{profile?.emergencyContact || "Not Set"}</p>
                      <p className="text-xl text-indigo-600 font-black mt-1">{profile?.emergencyPhone}</p>
                    </div>
                    <Button onClick={() => setActiveTab("sos")} variant="outline" className="w-full">
                      <QrCode size={24} /> View Emergency Card
                    </Button>
                  </div>
                </Card>

                <Card title="Daily Schedule" subtitle="Today's medication routine" className="bg-indigo-50 border-none">
                  <div className="space-y-4">
                    {medications.length > 0 ? (
                      medications.slice(0, 5).map((med, i) => (
                        <div key={i} className="flex items-center gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border-l-4 border-l-indigo-400">
                          <div className="bg-indigo-50 p-1.5 sm:p-2 rounded-lg">
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-base sm:text-lg font-black text-slate-800 leading-none">{med.name}</p>
                            <p className="text-[10px] sm:text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">{med.frequency}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest">Next</p>
                            <p className="text-xs sm:text-sm font-bold text-slate-700">8:00 AM</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 font-bold italic">No schedule available.</p>
                    )}
                    <Button variant="ghost" className="w-full mt-4 text-indigo-600 font-black">
                      View Full Schedule <ChevronRight size={20} />
                    </Button>
                  </div>
                </Card>
              </div>
              <MedicalDisclaimer />
            </motion.div>
          )}

          {activeTab === "scan" && (
            <motion.div key="scan" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-10">
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-black text-slate-900">Scan & Identify</h2>
                <p className="text-2xl text-slate-500 max-w-xl mx-auto font-medium">
                  Use your camera to scan prescriptions, lab reports, or identify unknown pills.
                </p>
              </div>

              {!scanType ? (
                <div className="grid gap-6">
                  <ScanOption 
                    icon={<FileText className="w-8 h-8 sm:w-12 sm:h-12" />} 
                    title="Prescription Reader" 
                    desc="Extract medication names and dosages" 
                    onClick={() => setScanType("prescription")}
                  />
                  <ScanOption 
                    icon={<Activity className="w-8 h-8 sm:w-12 sm:h-12" />} 
                    title="Lab Report Translator" 
                    desc="Understand your blood test results" 
                    onClick={() => setScanType("labs")}
                  />
                  <ScanOption 
                    icon={<Search className="w-8 h-8 sm:w-12 sm:h-12" />} 
                    title="Pill Identifier" 
                    desc="Identify loose pills from a photo" 
                    onClick={() => setScanType("pill")}
                  />
                </div>
              ) : (
                <div className="space-y-8">
                  <button onClick={() => setScanType(null)} className="flex items-center gap-2 text-slate-400 font-black uppercase tracking-widest hover:text-slate-600">
                    <ArrowLeft size={20} /> Back to Options
                  </button>
                  
                  {!isAnalyzing && !labResult && !pillResult ? (
                    <div className="max-w-md mx-auto">
                      <label className="block">
                        <div className="border-8 border-dashed border-slate-200 rounded-[64px] p-20 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
                          <Camera size={96} className="text-slate-200 mb-8 group-hover:text-emerald-500 transition-colors" />
                          <span className="text-3xl font-black text-slate-600">Capture Photo</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, scanType)} />
                        </div>
                      </label>
                    </div>
                  ) : isAnalyzing ? (
                    <div className="text-center py-20 space-y-8">
                      <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
                        <div className="bg-emerald-100 w-32 h-32 rounded-full flex items-center justify-center mx-auto">
                          <Activity size={64} className="text-emerald-600" />
                        </div>
                      </motion.div>
                      <h3 className="text-4xl font-black text-slate-900">AI Analyzing...</h3>
                      <p className="text-2xl text-slate-500 font-medium italic">"Deciphering medical data for you"</p>
                    </div>
                  ) : labResult ? (
                    <div className="space-y-8">
                      <Card title="Lab Analysis" subtitle="Plain English explanation of your results">
                        <div className="space-y-6">
                          {labResult.findings.map((f, i) => (
                            <div key={i} className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="text-2xl font-black text-slate-800">{f.test}: {f.value}</h4>
                                <Badge variant={f.status === "CRITICAL" ? "danger" : f.status === "BORDERLINE" ? "warning" : "success"}>
                                  {f.status}
                                </Badge>
                              </div>
                              <p className="text-xl text-slate-600 font-medium leading-relaxed">{f.explanation}</p>
                            </div>
                          ))}
                          <div className="p-8 bg-indigo-50 rounded-[32px]">
                            <h4 className="text-2xl font-black text-indigo-900 mb-2">Summary</h4>
                            <p className="text-xl text-indigo-700 font-medium leading-relaxed">{labResult.summary}</p>
                          </div>
                          <div className="space-y-4">
                            <h4 className="text-2xl font-black text-slate-800">Questions for your Doctor</h4>
                            <ul className="space-y-2">
                              {labResult.questions_for_doctor.map((q, i) => (
                                <li key={i} className="flex items-center gap-3 text-lg text-slate-600 font-bold">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full" /> {q}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <Button className="w-full mt-10" onClick={() => setLabResult(null)}>Analyze Another Report</Button>
                      </Card>
                    </div>
                  ) : pillResult ? (
                    <div className="max-w-xl mx-auto">
                      <Card title="Pill Identified" subtitle={`${Math.round(pillResult.confidence * 100)}% Confidence`}>
                        <div className="space-y-8">
                          <div className="text-center p-8 bg-emerald-50 rounded-[32px]">
                            <h4 className="text-4xl font-black text-emerald-900">{pillResult.name}</h4>
                            <p className="text-2xl font-bold text-emerald-700 mt-2">{pillResult.dosage}</p>
                          </div>
                          <div className="space-y-4">
                            <h5 className="text-xl font-black text-slate-400 uppercase tracking-widest">Purpose</h5>
                            <p className="text-2xl font-bold text-slate-700 leading-relaxed">{pillResult.purpose}</p>
                          </div>
                          {pillResult.warnings.length > 0 && (
                            <div className="p-6 bg-rose-50 rounded-[24px] border border-rose-100">
                              <h5 className="text-xl font-black text-rose-900 mb-3 flex items-center gap-2">
                                <AlertTriangle size={24} /> Safety Warnings
                              </h5>
                              <ul className="space-y-2">
                                {pillResult.warnings.map((w, i) => (
                                  <li key={i} className="text-lg text-rose-700 font-bold">• {w}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <Button className="w-full mt-10" onClick={() => setPillResult(null)}>Identify Another Pill</Button>
                      </Card>
                    </div>
                  ) : null}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "talk" && (
            <motion.div key="talk" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-black text-slate-900">Medical Voice Recorder</h2>
                <p className="text-2xl text-slate-500 max-w-xl mx-auto font-medium">
                  Speak your medical history or describe symptoms. AI will organize it for you.
                </p>
              </div>

              <Card className="space-y-8">
                <div className="p-10 bg-slate-50 rounded-[40px] border-2 border-slate-100 text-center">
                  <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Mic size={48} className="text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-400 italic">"I have high blood pressure and I take Lisinopril..."</p>
                </div>

                <div className="space-y-4">
                  <p className="text-xl font-black text-slate-400 uppercase tracking-widest">Or type it here:</p>
                  <textarea 
                    id="voice-text-input"
                    className="w-full h-48 p-8 text-2xl rounded-[32px] border-4 border-slate-100 focus:border-emerald-500 outline-none transition-all font-medium"
                    placeholder="Describe your medical history..."
                  />
                </div>

                <Button 
                  className="w-full" 
                  size="xl" 
                  disabled={isAnalyzing}
                  onClick={() => {
                    const input = document.getElementById("voice-text-input") as HTMLTextAreaElement;
                    handleVoiceHistory(input.value);
                  }}
                >
                  {isAnalyzing ? "Processing..." : "Update My History"}
                </Button>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-8 bg-indigo-50 rounded-[32px] space-y-6">
                  <div className="flex items-center gap-6">
                    <Languages size={48} className="text-indigo-600" />
                    <div>
                      <h4 className="text-2xl font-black text-indigo-900">Interpreter</h4>
                      <p className="text-lg text-indigo-700 font-medium">Translate medical terms</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <input 
                      id="translate-input"
                      className="w-full p-4 rounded-xl border-2 border-indigo-100 outline-none focus:border-indigo-500"
                      placeholder="Enter medical term..."
                    />
                    <select 
                      id="translate-lang"
                      className="w-full p-4 rounded-xl border-2 border-indigo-100 outline-none focus:border-indigo-500 bg-white"
                    >
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Chinese">Chinese</option>
                      <option value="Arabic">Arabic</option>
                    </select>
                    <Button 
                      variant="secondary" 
                      className="w-full" 
                      onClick={() => {
                        const text = (document.getElementById("translate-input") as HTMLInputElement).value;
                        const lang = (document.getElementById("translate-lang") as HTMLSelectElement).value;
                        handleTranslate(text, lang);
                      }}
                      disabled={isAnalyzing}
                    >
                      Translate
                    </Button>
                  </div>

                  {translationResult && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white rounded-2xl shadow-sm border border-indigo-100">
                      <p className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-1">{translationResult.language}</p>
                      <p className="text-2xl font-black text-slate-800">{translationResult.translated_text}</p>
                    </motion.div>
                  )}
                </Card>

                <div className="p-8 bg-emerald-50 rounded-[32px] flex items-center gap-6 h-fit">
                  <Users size={48} className="text-emerald-600" />
                  <div>
                    <h4 className="text-2xl font-black text-emerald-900">Caregiver Mode</h4>
                    <p className="text-lg text-emerald-700 font-medium">Record history for a family member</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "check" && (
            <motion.div key="check" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-black text-slate-900">Health Check</h2>
                <p className="text-2xl text-slate-500 max-w-xl mx-auto font-medium">
                  Assess symptom urgency or check for medication conflicts.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <Card 
                  title="Symptom Triage" 
                  subtitle="ER vs Doctor vs Home" 
                  className={cn(triageResult ? "md:col-span-2" : "")}
                >
                  {!triageResult ? (
                    <div className="space-y-6">
                      <textarea 
                        id="triage-input"
                        className="w-full h-40 p-6 text-xl rounded-2xl border-2 border-slate-100 focus:border-rose-500 outline-none"
                        placeholder="Describe your symptoms..."
                      />
                      <Button className="w-full" variant="danger" onClick={() => {
                        const input = document.getElementById("triage-input") as HTMLTextAreaElement;
                        handleTriage(input.value);
                      }}>
                        Assess Urgency
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className={cn(
                        "p-10 rounded-[40px] text-white shadow-xl",
                        triageResult.urgency === "EMERGENCY" ? "bg-rose-600" : 
                        triageResult.urgency === "URGENT" ? "bg-amber-500" : "bg-emerald-600"
                      )}>
                        <h3 className="text-6xl font-black mb-4">{triageResult.urgency}</h3>
                        <p className="text-2xl font-bold opacity-90 leading-relaxed">{triageResult.reasoning}</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="text-2xl font-black text-slate-800">Immediate Actions</h4>
                          <ul className="space-y-3">
                            {triageResult.immediate_actions.map((a, i) => (
                              <li key={i} className="flex items-center gap-3 text-xl font-bold text-slate-600">
                                <CheckCircle2 className="text-emerald-500" /> {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-2xl font-black text-slate-800">Likely Conditions</h4>
                          <div className="flex flex-wrap gap-2">
                            {triageResult.likely_conditions.map((c, i) => (
                              <Badge key={i} variant="info">{c}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      {triageResult.call_911 && (
                        <Button variant="danger" size="xl" className="w-full animate-pulse">CALL 911 NOW</Button>
                      )}
                      <Button variant="outline" className="w-full" onClick={() => setTriageResult(null)}>New Assessment</Button>
                    </div>
                  )}
                </Card>

                {!triageResult && (
                  <Card title="Drug Conflicts" subtitle="Check for dangerous interactions">
                    <div className="text-center py-6">
                      <AlertTriangle size={64} className="text-amber-400 mx-auto mb-6" />
                      <p className="text-xl text-slate-600 font-bold mb-8">Analyze your current medication list for safety.</p>
                      <Button variant="secondary" className="w-full" onClick={() => {
                        setActiveTab("check");
                        checkInteractions();
                      }}>
                        Run Interaction Check
                      </Button>
                    </div>
                  </Card>
                )}
              </div>

              {interactionResult && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className={cn(
                    "p-10 rounded-[40px] flex items-center justify-between",
                    interactionResult.overall_risk === "HIGH" ? "bg-rose-100 text-rose-700" : 
                    interactionResult.overall_risk === "MEDIUM" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                  )}>
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.3em] mb-2">Overall Risk</p>
                      <h3 className="text-5xl font-black">{interactionResult.overall_risk}</h3>
                    </div>
                    {interactionResult.overall_risk === "HIGH" ? <XCircle size={80} /> : <CheckCircle2 size={80} />}
                  </div>
                  {interactionResult.interactions.map((inter, i) => (
                    <Card key={i} className="border-l-[12px] border-l-amber-500">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-3xl font-black text-slate-800">{inter.drug_1} + {inter.drug_2}</h4>
                        <Badge variant={inter.severity === "HIGH" ? "danger" : "warning"}>{inter.severity}</Badge>
                      </div>
                      <p className="text-2xl font-bold text-slate-600 mb-6 leading-relaxed">{inter.risk}</p>
                      <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                        <p className="text-xl text-slate-700 font-medium">
                          <span className="font-black text-slate-900">Recommendation:</span> {inter.recommendation}
                        </p>
                      </div>
                    </Card>
                  ))}
                  <Button variant="outline" className="w-full" onClick={() => setInteractionResult(null)}>Clear Results</Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === "sos" && (
            <motion.div key="sos" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-black text-slate-900">Emergency SOS Card</h2>
                <p className="text-2xl text-slate-500 font-medium">Life-saving information for first responders.</p>
              </div>

              <div className="max-w-md mx-auto bg-white rounded-[48px] overflow-hidden shadow-2xl border-4 border-rose-500 relative">
                <div className="bg-rose-600 p-8 text-white text-center">
                  <h3 className="text-3xl font-black uppercase tracking-[0.2em]">Medical Alert</h3>
                </div>
                <div className="p-6 sm:p-10 space-y-6 sm:space-y-10">
                  <div className="flex justify-center bg-slate-50 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px]">
                    <QRCodeSVG 
                      value={JSON.stringify({
                        uid: user.uid,
                        name: profile?.name,
                        blood: profile?.bloodType,
                        allergies: profile?.allergies,
                        meds: medications.map(m => m.name),
                        emergency: profile?.emergencyPhone
                      })} 
                      size={window.innerWidth < 640 ? 180 : 240}
                      level="H"
                      includeMargin
                    />
                  </div>
                  <div className="space-y-6 sm:space-y-8 text-center">
                    <div>
                      <p className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Patient Name</p>
                      <p className="text-2xl sm:text-4xl font-black text-slate-800">{profile?.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:gap-8">
                      <div className="bg-rose-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                        <p className="text-[10px] sm:text-xs font-black text-rose-400 uppercase tracking-widest mb-1">Blood Type</p>
                        <p className="text-xl sm:text-3xl font-black text-rose-600">{profile?.bloodType}</p>
                      </div>
                      <div className="bg-indigo-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                        <p className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Contact</p>
                        <p className="text-lg sm:text-2xl font-black text-indigo-600 leading-tight">{profile?.emergencyPhone || "---"}</p>
                      </div>
                    </div>
                    {profile?.allergies && profile.allergies.length > 0 && (
                      <div className="p-4 bg-rose-600 rounded-2xl text-white">
                        <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-80">Critical Allergies</p>
                        <p className="text-xl font-black">{profile.allergies.join(", ")}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-slate-900 p-6 text-center">
                  <p className="text-sm font-black text-white uppercase tracking-[0.3em]">Scan for full medical history</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Button className="w-full" variant="outline"><Download size={24} /> Save Image</Button>
                <Button className="w-full" variant="outline"><Share2 size={24} /> Share Link</Button>
              </div>
              <Button 
                variant="danger" 
                size="xl" 
                className={cn("w-full py-8 text-3xl shadow-rose-200", isSOSActive && "animate-pulse")}
                onClick={handleSOS}
                disabled={isSOSActive}
              >
                {isSOSActive ? "BROADCASTING..." : <><AlertTriangle size={40} /> BROADCAST SOS</>}
              </Button>
            </motion.div>
          )}

          {activeTab === "family" && (
            <motion.div key="family" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black text-slate-900">Family Dashboard</h2>
                <Button onClick={() => setShowAddFamily(true)} size="md" variant="secondary">
                  <Plus size={24} /> Add Member
                </Button>
              </div>

              {showAddFamily && (
                <Card title="Add Family Member" subtitle="Manage health for your loved ones">
                  <form onSubmit={addFamilyMember} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-black text-slate-400 uppercase tracking-widest">Name</label>
                        <input name="name" required className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-black text-slate-400 uppercase tracking-widest">Relation</label>
                        <input name="relation" required className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none" placeholder="e.g. Father, Spouse" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-black text-slate-400 uppercase tracking-widest">Blood Type</label>
                        <input name="bloodType" className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-black text-slate-400 uppercase tracking-widest">Emergency Phone</label>
                        <input name="emergencyPhone" className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-slate-400 uppercase tracking-widest">Conditions (comma separated)</label>
                      <input name="conditions" className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-slate-400 uppercase tracking-widest">Allergies (comma separated)</label>
                      <input name="allergies" className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none" />
                    </div>
                    <div className="flex gap-4">
                      <Button type="submit" className="flex-1">Save Member</Button>
                      <Button type="button" variant="outline" onClick={() => setShowAddFamily(false)}>Cancel</Button>
                    </div>
                  </form>
                </Card>
              )}

              <div className="grid gap-6">
                <Card className="border-l-[12px] border-l-emerald-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-emerald-600">
                        {profile?.name?.[0]}
                      </div>
                      <div>
                        <h3 className="text-3xl font-black text-slate-800">{profile?.name} (Me)</h3>
                        <p className="text-lg text-slate-500 font-bold">Health Status: <span className="text-emerald-600">Stable</span></p>
                      </div>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                </Card>

                {familyMembers.map((member) => (
                  <Card key={member.id} className="border-l-[12px] border-l-indigo-500 relative group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-indigo-600">
                          {member.name[0]}
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-slate-800">{member.name}</h3>
                          <p className="text-lg text-indigo-600 font-black uppercase tracking-widest">{member.relation}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => deleteDoc(doc(db, "users", user.uid, "family", member.id))}
                          className="p-4 text-slate-200 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={24} />
                        </button>
                        <ChevronRight size={32} className="text-slate-300" />
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Blood Type</p>
                        <p className="text-xl font-black text-slate-700">{member.bloodType || "---"}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Conditions</p>
                        <p className="text-xl font-black text-slate-700">{member.conditions?.length || 0} Listed</p>
                      </div>
                    </div>
                  </Card>
                ))}

                {familyMembers.length === 0 && !showAddFamily && (
                  <Card className="border-dashed border-4 border-slate-200 text-center py-12">
                    <Users size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-xl font-bold text-slate-400">No family members added yet.</p>
                    <Button onClick={() => setShowAddFamily(true)} variant="ghost" className="mt-4 mx-auto text-indigo-600">
                      Add your first member
                    </Button>
                  </Card>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 sm:px-6 py-2 sm:py-4 flex justify-around items-center z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <NavButton active={activeTab === "home"} onClick={() => setActiveTab("home")} icon={<Activity className="w-6 h-6 sm:w-9 sm:h-9" />} label="Home" />
        <NavButton active={activeTab === "scan"} onClick={() => setActiveTab("scan")} icon={<Camera className="w-6 h-6 sm:w-9 sm:h-9" />} label="Scan" />
        <NavButton active={activeTab === "talk"} onClick={() => setActiveTab("talk")} icon={<Mic className="w-6 h-6 sm:w-9 sm:h-9" />} label="Talk" />
        <NavButton active={activeTab === "check"} onClick={() => setActiveTab("check")} icon={<AlertTriangle className="w-6 h-6 sm:w-9 sm:h-9" />} label="Check" />
        <NavButton active={activeTab === "family"} onClick={() => setActiveTab("family")} icon={<Users className="w-6 h-6 sm:w-9 sm:h-9" />} label="Family" />
        <NavButton active={activeTab === "sos"} onClick={() => setActiveTab("sos")} icon={<QrCode className="w-6 h-6 sm:w-9 sm:h-9" />} label="SOS" />
      </nav>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1 sm:gap-2 px-2 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-[24px] transition-all flex-1",
      active ? "text-emerald-600 bg-emerald-50 scale-105 sm:scale-110" : "text-slate-300 hover:text-slate-500"
    )}
  >
    {icon}
    <span className="text-[8px] sm:text-xs font-black uppercase tracking-widest">{label}</span>
  </button>
);

const ScanOption = ({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-4 sm:gap-8 bg-white p-4 sm:p-8 rounded-[24px] sm:rounded-[40px] shadow-sm hover:shadow-md hover:border-emerald-200 border-2 border-transparent transition-all text-left w-full group"
  >
    <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl sm:rounded-[32px] text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-all">
      {icon}
    </div>
    <div className="flex-1">
      <h4 className="text-xl sm:text-3xl font-black text-slate-800">{title}</h4>
      <p className="text-sm sm:text-xl text-slate-500 font-medium mt-1">{desc}</p>
    </div>
    <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-slate-200 group-hover:text-emerald-300 transition-all" />
  </button>
);
