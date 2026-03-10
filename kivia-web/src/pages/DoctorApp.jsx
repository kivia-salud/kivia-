import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import ProgressCharts from "../components/ProgressCharts";
import { buildMeasurementInsights } from "../utils/health";

const BRAND = {
  bg: "#eef3f7",
  surface: "#ffffff",
  surfaceSoft: "#f8fafc",
  dark: "#1f3b53",
  darkSoft: "#2f4b63",
  border: "rgba(15, 23, 42, 0.10)",
  muted: "rgba(15, 23, 42, 0.62)",
  text: "#0f172a",
  accent: "#dce9f2",
  accentStrong: "#c9dbe8",
  successBg: "#f0fff4",
  successBorder: "#2f855a",
  successText: "#22543d",
  warningBg: "#fffbeb",
  warningBorder: "#d97706",
  warningText: "#92400e",
  dangerBg: "#fff5f5",
  dangerBorder: "#dc2626",
  dangerText: "#8a0b0b",
};

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () =>
    Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `KIV-${part()}`;
}

function toISODate(date) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 10);
}

function getMondayFromDate(dateInput) {
  const d = new Date(dateInput);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return toISODate(d);
}

function mondayOfThisWeek() {
  return getMondayFromDate(new Date());
}

function todayISO() {
  return toISODate(new Date());
}

function calcBMI(weightKg, heightCm) {
  const w = Number(weightKg);
  const h = Number(heightCm);
  if (!w || !h) return null;
  const hm = h / 100;
  if (!hm) return null;
  return Math.round((w / (hm * hm)) * 10) / 10;
}

function computeAdherencePercent(log) {
  if (!log) return 0;

  const fields = [
    "breakfast_ok",
    "snack1_ok",
    "lunch_ok",
    "snack2_ok",
    "dinner_ok",
    "workout_ok",
    "water_ok",
    "steps_ok",
    "sleep_ok",
  ];

  const total = fields.length;
  const done = fields.filter((key) => !!log[key]).length;
  return Math.round((done / total) * 100);
}

function buildWeeklyAverage(logs = []) {
  if (!logs.length) return 0;
  const values = logs.map((log) => computeAdherencePercent(log));
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  const diff = Math.abs(b - a);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function emptyPlanV2() {
  return {
    type: "structured_v2",
    version: 1,
    days: DAY_NAMES.map((d) => ({
      day: d,
      breakfast: "",
      snack1: "",
      lunch: "",
      snack2: "",
      dinner: "",
      training: "",
      notes: "",
    })),
    generalNotes: "",
  };
}

function defaultPlanText() {
  return "Ejemplo:\nLunes:\n- Desayuno: ...\n- Almuerzo: ...\nEntrenamiento: ...\n\nMartes: ...";
}

function getAdherenceStatusFromDate(lastDate) {
  if (!lastDate) return { label: "Sin registros", tone: "neutral", risk: "high" };
  const days = daysBetween(lastDate, todayISO());
  if (days === 0) return { label: "Registro al día", tone: "success", risk: "low" };
  if (days <= 2) return { label: `Último registro hace ${days} día(s)`, tone: "warning", risk: "medium" };
  return { label: `Sin registrar hace ${days} días`, tone: "danger", risk: "high" };
}

function getRiskLabel(avg, lastDate) {
  const days = lastDate ? daysBetween(lastDate, todayISO()) : 999;

  if (!lastDate || days >= 3) {
    return { label: "Alto riesgo", tone: "danger" };
  }

  if (avg < 50) {
    return { label: "Riesgo moderado", tone: "warning" };
  }

  return { label: "Seguimiento estable", tone: "success" };
}

function PageShell({ children, isMobile = false }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #e9f0f5 0%, #eef3f7 220px, #f5f8fb 100%)",
        padding: "clamp(12px, 2vw, 24px)",
        paddingBottom: isMobile ? 98 : "clamp(12px, 2vw, 24px)",
      }}
    >
      <div style={{ maxWidth: 1480, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

function Card({ title, subtitle, action, children, noPadding = false }) {
  return (
    <div
      style={{
        background: BRAND.surface,
        border: `1px solid ${BRAND.border}`,
        borderRadius: 22,
        boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
        overflow: "hidden",
      }}
    >
      {(title || subtitle || action) && (
        <div
          style={{
            padding: "18px 20px",
            borderBottom: `1px solid ${BRAND.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {title ? (
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 17,
                  color: BRAND.text,
                  letterSpacing: "-0.02em",
                }}
              >
                {title}
              </div>
            ) : null}
            {subtitle ? (
              <div style={{ marginTop: 4, color: BRAND.muted, fontSize: 13 }}>
                {subtitle}
              </div>
            ) : null}
          </div>
          {action}
        </div>
      )}

      <div style={{ padding: noPadding ? 0 : 20 }}>{children}</div>
    </div>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div
      style={{
        marginBottom: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          fontWeight: 900,
          color: BRAND.text,
          fontSize: 15,
        }}
      >
        {children}
      </div>
      {right}
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div
      style={{
        background: BRAND.surface,
        border: `1px solid ${BRAND.border}`,
        borderRadius: 18,
        padding: 16,
        minHeight: 104,
        boxShadow: "0 6px 20px rgba(15,23,42,0.04)",
      }}
    >
      <div style={{ color: BRAND.muted, fontSize: 12, fontWeight: 700 }}>{label}</div>
      <div
        style={{
          marginTop: 8,
          fontSize: "clamp(22px, 3vw, 28px)",
          fontWeight: 900,
          color: BRAND.text,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
      {hint ? <div style={{ marginTop: 6, color: BRAND.muted, fontSize: 12 }}>{hint}</div> : null}
    </div>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 14,
        cursor: "pointer",
        border: active ? "1px solid rgba(31,59,83,0.18)" : `1px solid ${BRAND.border}`,
        background: active ? BRAND.accent : BRAND.surface,
        color: BRAND.text,
        fontWeight: 800,
        transition: "0.18s ease",
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, type = "button", disabled = false }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "12px 16px",
        borderRadius: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        border: "none",
        background: disabled ? "#94a3b8" : BRAND.dark,
        color: "white",
        fontWeight: 900,
        boxShadow: disabled ? "none" : "0 8px 20px rgba(31,59,83,0.18)",
        width: "fit-content",
        maxWidth: "100%",
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "11px 14px",
        borderRadius: 14,
        cursor: "pointer",
        border: `1px solid ${BRAND.border}`,
        background: BRAND.surface,
        color: BRAND.text,
        fontWeight: 800,
      }}
    >
      {children}
    </button>
  );
}

function SmallBadge({ children, tone = "neutral" }) {
  const styles =
    tone === "success"
      ? {
          background: "#ecfdf3",
          color: "#166534",
          border: "1px solid rgba(22,101,52,0.15)",
        }
      : tone === "warning"
      ? {
          background: "#fffbeb",
          color: "#92400e",
          border: "1px solid rgba(146,64,14,0.12)",
        }
      : tone === "danger"
      ? {
          background: "#fff1f2",
          color: "#b91c1c",
          border: "1px solid rgba(185,28,28,0.12)",
        }
      : {
          background: "#f8fafc",
          color: "#334155",
          border: "1px solid rgba(51,65,85,0.10)",
        };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        ...styles,
      }}
    >
      {children}
    </span>
  );
}

function DataField({ label, value }) {
  return (
    <div
      style={{
        background: BRAND.surfaceSoft,
        border: `1px solid ${BRAND.border}`,
        borderRadius: 14,
        padding: 12,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 12, color: BRAND.muted, fontWeight: 700 }}>{label}</div>
      <div
        style={{
          marginTop: 6,
          fontSize: 14,
          color: BRAND.text,
          fontWeight: 800,
          wordBreak: "break-word",
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function MobileNavButton({ active, label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: "8px 6px",
        display: "grid",
        justifyItems: "center",
        gap: 4,
        color: active ? BRAND.dark : "rgba(15,23,42,0.55)",
        fontWeight: active ? 900 : 700,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 11, whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: 12,
  borderRadius: 14,
  border: `1px solid ${BRAND.border}`,
  background: "#fff",
  color: BRAND.text,
  outline: "none",
  minWidth: 0,
};

const textareaStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: 12,
  borderRadius: 14,
  border: `1px solid ${BRAND.border}`,
  background: "#fff",
  color: BRAND.text,
  outline: "none",
  fontFamily: "inherit",
  resize: "vertical",
  minWidth: 0,
};

const responsiveGrid = (min = 220) => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`,
  gap: 12,
});

export default function DoctorApp() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [doctorId, setDoctorId] = useState(null);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [patientStatsMap, setPatientStatsMap] = useState({});
  const [loadingPatientStats, setLoadingPatientStats] = useState(false);

  const [activeTab, setActiveTab] = useState("medica");

  const [dx, setDx] = useState("");
  const [antecedentes, setAntecedentes] = useState("");
  const [alergias, setAlergias] = useState("");
  const [meds, setMeds] = useState("");
  const [labs, setLabs] = useState("");
  const [notasClinicas, setNotasClinicas] = useState("");

  const [objetivo, setObjetivo] = useState("");
  const [restricciones, setRestricciones] = useState("");
  const [gustos, setGustos] = useState("");
  const [discapacidadLesion, setDiscapacidadLesion] = useState("");
  const [actividad, setActividad] = useState("");
  const [habitos, setHabitos] = useState("");
  const [notasNutri, setNotasNutri] = useState("");

  const [pesoBase, setPesoBase] = useState("");
  const [gcBase, setGcBase] = useState("");
  const [mmBase, setMmBase] = useState("");
  const [cinturaBase, setCinturaBase] = useState("");
  const [caderaBase, setCaderaBase] = useState("");
  const [pechoBase, setPechoBase] = useState("");
  const [brazoBase, setBrazoBase] = useState("");
  const [musloBase, setMusloBase] = useState("");
  const [pantorrillaBase, setPantorrillaBase] = useState("");

  const [mDate, setMDate] = useState(todayISO());
  const [mWeight, setMWeight] = useState("");
  const [mHeight, setMHeight] = useState("");
  const [mWaist, setMWaist] = useState("");
  const [mHip, setMHip] = useState("");
  const [mChest, setMChest] = useState("");
  const [mArm, setMArm] = useState("");
  const [mThigh, setMThigh] = useState("");
  const [mCalf, setMCalf] = useState("");
  const [mFat, setMFat] = useState("");
  const [mMuscle, setMMuscle] = useState("");
  const [mNotes, setMNotes] = useState("");
  const [progressRows, setProgressRows] = useState([]);

  const [weekStart, setWeekStart] = useState(mondayOfThisWeek());
  const [planMode, setPlanMode] = useState("v2");
  const [planText, setPlanText] = useState(defaultPlanText());
  const [planV2, setPlanV2] = useState(emptyPlanV2());

  const [name, setName] = useState("");
  const [sex, setSex] = useState("Masculino");
  const [height, setHeight] = useState("");

  const [todayAdherence, setTodayAdherence] = useState(null);
  const [weekAdherence, setWeekAdherence] = useState([]);
  const [lastAdherenceLog, setLastAdherenceLog] = useState(null);

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  const [mobileSection, setMobileSection] = useState("home");

  const canCreate = useMemo(() => name.trim().length >= 2, [name]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedId) || null,
    [patients, selectedId]
  );

  const selectedPatientStats = useMemo(() => {
    if (!selectedId) return null;
    return patientStatsMap[selectedId] || null;
  }, [patientStatsMap, selectedId]);

  const progressDataAsc = useMemo(() => {
    return [...progressRows].sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
  }, [progressRows]);

  const measurementInsights = useMemo(() => {
    return buildMeasurementInsights(progressRows);
  }, [progressRows]);

  const lastMeasurement = useMemo(() => {
    if (!progressRows.length) return null;
    return [...progressRows].sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))[0];
  }, [progressRows]);

  const initialMeasurement = useMemo(() => {
    if (!progressRows.length) return null;
    return [...progressRows].sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at))[0];
  }, [progressRows]);

  const todayAdherencePercent = useMemo(() => {
    return computeAdherencePercent(todayAdherence);
  }, [todayAdherence]);

  const weeklyAdherenceAverage = useMemo(() => {
    return buildWeeklyAverage(weekAdherence);
  }, [weekAdherence]);

  const adherenceStatus = useMemo(() => {
    if (!lastAdherenceLog?.log_date) return { label: "Sin registros", tone: "neutral" };
    const days = daysBetween(lastAdherenceLog.log_date, todayISO());
    if (days === 0) return { label: "Registro al día", tone: "success" };
    if (days <= 2) return { label: `Último registro hace ${days} día(s)`, tone: "warning" };
    return { label: `Sin registrar hace ${days} días`, tone: "danger" };
  }, [lastAdherenceLog]);

  const summaryWeightChange = useMemo(() => {
    if (!lastMeasurement?.weight_kg || !initialMeasurement?.weight_kg) return "-";
    const diff = Number(lastMeasurement.weight_kg) - Number(initialMeasurement.weight_kg);
    if (diff === 0) return "0 kg";
    return `${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg`;
  }, [lastMeasurement, initialMeasurement]);

  const summaryWaistChange = useMemo(() => {
    if (!lastMeasurement?.waist_cm || !initialMeasurement?.waist_cm) return "-";
    const diff = Number(lastMeasurement.waist_cm) - Number(initialMeasurement.waist_cm);
    if (diff === 0) return "0 cm";
    return `${diff > 0 ? "+" : ""}${diff.toFixed(1)} cm`;
  }, [lastMeasurement, initialMeasurement]);

  const dashboardStats = useMemo(() => {
    const values = Object.values(patientStatsMap);
    const total = patients.length;
    const withAlert = values.filter((s) => s?.risk?.tone === "danger").length;
    const stable = values.filter((s) => s?.risk?.tone === "success").length;
    const avg = values.length
      ? Math.round(values.reduce((acc, item) => acc + (item.weeklyAverage || 0), 0) / values.length)
      : 0;

    return {
      total,
      withAlert,
      stable,
      avg,
    };
  }, [patientStatsMap, patients]);

  const patientsSortedForTriage = useMemo(() => {
    const list = [...patients];

    list.sort((a, b) => {
      const sa = patientStatsMap[a.id];
      const sb = patientStatsMap[b.id];

      const score = (s) => {
        if (!s) return 1;
        if (s.risk?.tone === "danger") return 3;
        if (s.risk?.tone === "warning") return 2;
        return 1;
      };

      const riskDiff = score(sb) - score(sa);
      if (riskDiff !== 0) return riskDiff;

      return new Date(b.created_at) - new Date(a.created_at);
    });

    return list;
  }, [patients, patientStatsMap]);

  const showHomeSection = !isMobile || mobileSection === "home";
  const showPatientsSection = !isMobile || mobileSection === "patients";
  const showTrackingSection = !isMobile || mobileSection === "tracking";
  const showPlansSection = !isMobile || mobileSection === "plans";

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    if (mobileSection === "patients" && selectedId) return;
  }, [isMobile, mobileSection, selectedId]);

  const loadPatients = async (docId) => {
    const { data, error } = await supabase
      .from("patient_profiles")
      .select("id, full_name, sex, height_cm, patient_user_id, intake, created_at")
      .eq("doctor_user_id", docId)
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      return;
    }

    const list = data || [];
    setPatients(list);

    if (!selectedId && list?.[0]?.id) {
      setSelectedId(list[0].id);
    }
  };

  const loadPatientStats = async (patientList) => {
    if (!patientList?.length) {
      setPatientStatsMap({});
      return;
    }

    setLoadingPatientStats(true);

    const nextMap = {};

    await Promise.all(
      patientList.map(async (patient) => {
        const start = new Date();
        start.setDate(start.getDate() - 6);
        const startDate = toISODate(start);

        const [{ data: logs }, { data: plans }, { data: measurements }] = await Promise.all([
          supabase
            .from("daily_adherence_logs")
            .select("*")
            .eq("patient_profile_id", patient.id)
            .gte("log_date", startDate)
            .order("log_date", { ascending: false }),
          supabase
            .from("weekly_plans")
            .select("week_start, updated_at")
            .eq("patient_profile_id", patient.id)
            .order("week_start", { ascending: false })
            .limit(1),
          supabase
            .from("measurements")
            .select("measured_at, weight_kg, waist_cm")
            .eq("patient_profile_id", patient.id)
            .order("measured_at", { ascending: false })
            .limit(1),
        ]);

        const weekLogs = logs || [];
        const weeklyAverage = buildWeeklyAverage(weekLogs);
        const lastLog = weekLogs[0] || null;
        const adherenceState = getAdherenceStatusFromDate(lastLog?.log_date || null);
        const risk = getRiskLabel(weeklyAverage, lastLog?.log_date || null);
        const latestPlan = plans?.[0] || null;
        const latestMeasurement = measurements?.[0] || null;

        nextMap[patient.id] = {
          weeklyAverage,
          lastLogDate: lastLog?.log_date || null,
          adherenceState,
          risk,
          latestPlanWeek: latestPlan?.week_start || null,
          latestPlanUpdatedAt: latestPlan?.updated_at || null,
          latestMeasurementDate: latestMeasurement?.measured_at || null,
          latestWeight: latestMeasurement?.weight_kg ?? null,
          latestWaist: latestMeasurement?.waist_cm ?? null,
        };
      })
    );

    setPatientStatsMap(nextMap);
    setLoadingPatientStats(false);
  };

  const loadProgress = async (profileId) => {
    const { data, error } = await supabase
      .from("measurements")
      .select(
        "id, measured_at, weight_kg, height_cm, bmi, waist_cm, hip_cm, chest_cm, arm_cm, thigh_cm, calf_cm, bodyfat_pct, muscle_pct, notes"
      )
      .eq("patient_profile_id", profileId)
      .order("measured_at", { ascending: false });

    if (error) {
      setErr(error.message);
    } else {
      setProgressRows(data || []);
    }
  };

  const loadAdherence = async (profileId) => {
    const today = todayISO();

    const { data: todayLog, error: e1 } = await supabase
      .from("daily_adherence_logs")
      .select("*")
      .eq("patient_profile_id", profileId)
      .eq("log_date", today)
      .maybeSingle();

    if (e1) {
      setErr(e1.message);
    } else {
      setTodayAdherence(todayLog || null);
    }

    const start = new Date();
    start.setDate(start.getDate() - 6);
    const startDate = toISODate(start);

    const { data: weekLogs, error: e2 } = await supabase
      .from("daily_adherence_logs")
      .select("*")
      .eq("patient_profile_id", profileId)
      .gte("log_date", startDate)
      .order("log_date", { ascending: false });

    if (e2) {
      setErr(e2.message);
    } else {
      const logs = weekLogs || [];
      setWeekAdherence(logs);
      setLastAdherenceLog(logs[0] || null);
    }
  };

  const loadWeeklyPlan = async (profileId, startDate) => {
    if (!profileId || !startDate) return;

    const monday = getMondayFromDate(startDate);

    const { data, error } = await supabase
      .from("weekly_plans")
      .select("plan")
      .eq("patient_profile_id", profileId)
      .eq("week_start", monday)
      .maybeSingle();

    if (error) {
      setErr(error.message);
      return;
    }

    const savedPlan = data?.plan;

    if (!savedPlan) {
      setPlanMode("v2");
      setPlanV2(emptyPlanV2());
      setPlanText(defaultPlanText());
      return;
    }

    if (savedPlan.type === "structured_v2") {
      setPlanMode("v2");
      setPlanV2({
        ...emptyPlanV2(),
        ...savedPlan,
        days:
          Array.isArray(savedPlan.days) && savedPlan.days.length === 7
            ? savedPlan.days.map((day, index) => ({
                ...emptyPlanV2().days[index],
                ...day,
                day: DAY_NAMES[index],
              }))
            : emptyPlanV2().days,
      });
      setPlanText(defaultPlanText());
      return;
    }

    if (savedPlan.type === "text_v1") {
      setPlanMode("text");
      setPlanText(savedPlan.text || "");
      setPlanV2(emptyPlanV2());
      return;
    }

    setPlanMode("v2");
    setPlanV2(emptyPlanV2());
    setPlanText(defaultPlanText());
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        nav("/login", { replace: true });
        return;
      }

      const user = data.session.user;
      setEmail(user.email || "");

      const { data: doctorRow } = await supabase
        .from("doctors")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!doctorRow?.user_id) {
        nav("/patient", { replace: true });
        return;
      }

      setDoctorId(user.id);
      await loadPatients(user.id);
    })();
  }, [nav]);

  useEffect(() => {
    if (!patients.length) {
      setPatientStatsMap({});
      return;
    }

    loadPatientStats(patients);
  }, [patients]);

  useEffect(() => {
    setErr("");
    setMsg("");

    if (!selectedPatient) {
      setPlanMode("v2");
      setPlanV2(emptyPlanV2());
      setPlanText(defaultPlanText());
      return;
    }

    const intake = selectedPatient.intake || {};
    const m = intake.medica || {};
    const n = intake.nutri || {};
    const a = intake.antropometria || {};

    setDx(m.dx || "");
    setAntecedentes(m.antecedentes || "");
    setAlergias(m.alergias || "");
    setMeds(m.meds || "");
    setLabs(m.labs || "");
    setNotasClinicas(m.notasClinicas || "");

    setObjetivo(n.objetivo || "");
    setRestricciones(n.restricciones || "");
    setGustos(n.gustos || "");
    setDiscapacidadLesion(n.discapacidadLesion || "");
    setActividad(n.actividad || "");
    setHabitos(n.habitos || "");
    setNotasNutri(n.notasNutri || "");

    setPesoBase(a.pesoKg ?? "");
    setGcBase(a.grasaPct ?? "");
    setMmBase(a.musculoPct ?? "");
    setCinturaBase(a.cinturaCm ?? "");
    setCaderaBase(a.caderaCm ?? "");
    setPechoBase(a.pechoCm ?? "");
    setBrazoBase(a.brazoCm ?? "");
    setMusloBase(a.musloCm ?? "");
    setPantorrillaBase(a.pantorrillaCm ?? "");

    if (selectedPatient?.id) {
      loadProgress(selectedPatient.id);
      loadAdherence(selectedPatient.id);
      loadWeeklyPlan(selectedPatient.id, weekStart);
    }
  }, [selectedPatient, weekStart]);

  const salir = async () => {
    await supabase.auth.signOut();
    nav("/login", { replace: true });
  };

  const crearPacienteYCodigo = async () => {
    setErr("");
    setMsg("");

    if (!doctorId) return setErr("No hay sesión de doctor.");
    if (!canCreate) return setErr("Pon al menos el nombre del paciente.");

    const { data: created, error: e1 } = await supabase
      .from("patient_profiles")
      .insert({
        doctor_user_id: doctorId,
        full_name: name.trim(),
        sex,
        height_cm: height ? Number(height) : null,
        intake: { medica: {}, nutri: {}, antropometria: {} },
      })
      .select("id, full_name")
      .single();

    if (e1) return setErr(e1.message);

    const code = genCode();

    const { error: e2 } = await supabase.from("patient_invites").insert({
      code,
      doctor_user_id: doctorId,
      patient_profile_id: created.id,
    });

    if (e2) return setErr(e2.message);

    setMsg(`Paciente creado: ${created.full_name}. Código: ${code}`);
    setName("");
    setHeight("");
    await loadPatients(doctorId);
    setSelectedId(created.id);

    if (isMobile) {
      setMobileSection("patients");
    }
  };

  const guardarHistoriaClinica = async () => {
    setErr("");
    setMsg("");

    if (!selectedId) return setErr("Selecciona un paciente.");

    const intake = {
      medica: {
        dx: dx.trim(),
        antecedentes: antecedentes.trim(),
        alergias: alergias.trim(),
        meds: meds.trim(),
        labs: labs.trim(),
        notasClinicas: notasClinicas.trim(),
      },
      nutri: {
        objetivo: objetivo.trim(),
        restricciones: restricciones.trim(),
        gustos: gustos.trim(),
        discapacidadLesion: discapacidadLesion.trim(),
        actividad: actividad.trim(),
        habitos: habitos.trim(),
        notasNutri: notasNutri.trim(),
      },
      antropometria: {
        pesoKg: pesoBase === "" ? null : Number(pesoBase),
        grasaPct: gcBase === "" ? null : Number(gcBase),
        musculoPct: mmBase === "" ? null : Number(mmBase),
        cinturaCm: cinturaBase === "" ? null : Number(cinturaBase),
        caderaCm: caderaBase === "" ? null : Number(caderaBase),
        pechoCm: pechoBase === "" ? null : Number(pechoBase),
        brazoCm: brazoBase === "" ? null : Number(brazoBase),
        musloCm: musloBase === "" ? null : Number(musloBase),
        pantorrillaCm: pantorrillaBase === "" ? null : Number(pantorrillaBase),
      },
      updatedAt: new Date().toISOString(),
      updatedBy: doctorId,
    };

    const { data, error } = await supabase
      .from("patient_profiles")
      .update({ intake })
      .eq("id", selectedId)
      .select("id, intake")
      .maybeSingle();

    if (error) return setErr(error.message);

    setPatients((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, intake: data?.intake || intake } : p))
    );

    setMsg("✅ Historia clínica guardada.");
  };

  const addMeasurement = async () => {
    setErr("");
    setMsg("");

    if (!selectedId) return setErr("Selecciona un paciente.");

    const heightUse = mHeight || selectedPatient?.height_cm || null;
    const bmi = calcBMI(mWeight, heightUse);

    const payload = {
      patient_profile_id: selectedId,
      measured_at: mDate,
      weight_kg: mWeight === "" ? null : Number(mWeight),
      height_cm: heightUse === "" ? null : Number(heightUse),
      bmi,
      waist_cm: mWaist === "" ? null : Number(mWaist),
      hip_cm: mHip === "" ? null : Number(mHip),
      chest_cm: mChest === "" ? null : Number(mChest),
      arm_cm: mArm === "" ? null : Number(mArm),
      thigh_cm: mThigh === "" ? null : Number(mThigh),
      calf_cm: mCalf === "" ? null : Number(mCalf),
      bodyfat_pct: mFat === "" ? null : Number(mFat),
      muscle_pct: mMuscle === "" ? null : Number(mMuscle),
      notes: mNotes.trim() || null,
    };

    const { error } = await supabase.from("measurements").insert(payload);

    if (error) return setErr(error.message);

    setMsg("✅ Medición guardada.");
    setMNotes("");
    await loadProgress(selectedId);
    await loadPatientStats(patients);

    if (isMobile) {
      setMobileSection("tracking");
    }
  };

  const deleteMeasurement = async (rowId) => {
    setErr("");
    setMsg("");

    if (!rowId) return;

    const ok = window.confirm("¿Eliminar esta medición? Esto no se puede deshacer.");
    if (!ok) return;

    const { error } = await supabase.from("measurements").delete().eq("id", rowId);

    if (error) return setErr(error.message);

    setMsg("✅ Medición eliminada.");

    if (selectedId) {
      await loadProgress(selectedId);
      await loadPatientStats(patients);
    }
  };

  const updatePlanV2Cell = (dayIndex, key, value) => {
    setPlanV2((prev) => {
      const next = structuredClone(prev);
      next.days[dayIndex][key] = value;
      return next;
    });
  };

  const handleWeekStartChange = (value) => {
    const monday = getMondayFromDate(value);
    setWeekStart(monday);
  };

  const guardarPlanSemanal = async () => {
    setErr("");
    setMsg("");

    if (!selectedId) return setErr("Selecciona un paciente.");
    if (!weekStart) return setErr("Elige el inicio de semana.");

    const safeWeekStart = getMondayFromDate(weekStart);

    const plan =
      planMode === "v2"
        ? {
            ...planV2,
            type: "structured_v2",
            version: 1,
            updatedBy: doctorId,
            updatedAt: new Date().toISOString(),
          }
        : {
            type: "text_v1",
            text: planText,
            updatedBy: doctorId,
            updatedAt: new Date().toISOString(),
          };

    const { error } = await supabase.from("weekly_plans").upsert(
      {
        patient_profile_id: selectedId,
        week_start: safeWeekStart,
        plan,
      },
      {
        onConflict: "patient_profile_id,week_start",
      }
    );

    if (error) return setErr(error.message);

    setWeekStart(safeWeekStart);
    await loadWeeklyPlan(selectedId, safeWeekStart);
    await loadPatientStats(patients);

    setMsg(`✅ Plan publicado para ${selectedPatient?.full_name || "paciente"} (semana ${safeWeekStart}).`);

    if (isMobile) {
      setMobileSection("plans");
    }
  };

  const resetPlanV2 = () => setPlanV2(emptyPlanV2());

  return (
    <PageShell isMobile={isMobile}>
      <div
        style={{
          background: `linear-gradient(135deg, ${BRAND.dark} 0%, ${BRAND.darkSoft} 100%)`,
          borderRadius: 28,
          padding: "clamp(16px, 2vw, 24px)",
          color: "white",
          boxShadow: "0 18px 40px rgba(31,59,83,0.22)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "clamp(24px, 4vw, 28px)", fontWeight: 900, letterSpacing: "-0.03em" }}>
              KiviA Doctor
            </div>
            <div style={{ marginTop: 6, fontSize: 14, opacity: 0.9 }}>
              Gestión clínica, progreso, adherencia y alertas en un solo panel.
            </div>
            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85, wordBreak: "break-word" }}>{email}</div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "fit-content", maxWidth: "100%" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                padding: "10px 14px",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Pacientes: {patients.length}
            </div>

            <button
              onClick={salir}
              style={{
                padding: "11px 14px",
                borderRadius: 14,
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                fontWeight: 900,
              }}
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      {err ? (
        <div
          style={{
            marginTop: 16,
            background: BRAND.dangerBg,
            border: `1px solid ${BRAND.dangerBorder}`,
            color: BRAND.dangerText,
            padding: 12,
            borderRadius: 16,
            fontWeight: 800,
          }}
        >
          {err}
        </div>
      ) : null}

      {msg ? (
        <div
          style={{
            marginTop: 16,
            background: BRAND.successBg,
            border: `1px solid ${BRAND.successBorder}`,
            color: BRAND.successText,
            padding: 12,
            borderRadius: 16,
            fontWeight: 800,
          }}
        >
          {msg}
        </div>
      ) : null}

      {showHomeSection ? (
        <div style={{ marginTop: 18, ...responsiveGrid(220) }}>
          <StatCard
            label="Pacientes totales"
            value={dashboardStats.total}
            hint={loadingPatientStats ? "Actualizando..." : "Base actual"}
          />
          <StatCard
            label="Con alerta"
            value={dashboardStats.withAlert}
            hint="Sin registros o alto riesgo"
          />
          <StatCard
            label="Seguimiento estable"
            value={dashboardStats.stable}
            hint="Bajo riesgo actual"
          />
          <StatCard
            label="Promedio global"
            value={`${dashboardStats.avg}%`}
            hint="Adherencia 7 días"
          />
        </div>
      ) : null}

      <div
        className="doctor-main-layout"
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 360px) minmax(0, 1fr)",
          gap: 18,
          alignItems: "start",
        }}
      >
        {showPatientsSection ? (
          <div
            style={{
              display: "grid",
              gap: 18,
              position: isMobile ? "static" : "sticky",
              top: 20,
            }}
            className="doctor-sidebar"
          >
            <Card title="Nuevo paciente" subtitle="Crea y genera su código de vinculación">
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  placeholder="Nombre del paciente"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                />

                <select value={sex} onChange={(e) => setSex(e.target.value)} style={inputStyle}>
                  <option>Masculino</option>
                  <option>Femenino</option>
                  <option>Otro</option>
                </select>

                <input
                  placeholder="Altura (cm)"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  style={inputStyle}
                />

                <PrimaryButton onClick={crearPacienteYCodigo} disabled={!canCreate}>
                  Crear y generar código
                </PrimaryButton>
              </div>
            </Card>

            <Card
              title="Triage de pacientes"
              subtitle="Se ordenan por riesgo primero"
              action={
                <SecondaryButton onClick={() => loadPatientStats(patients)}>
                  Recargar
                </SecondaryButton>
              }
            >
              <div style={{ display: "grid", gap: 10, maxHeight: 680, overflowY: "auto" }}>
                {patientsSortedForTriage.map((p) => {
                  const active = p.id === selectedId;
                  const stats = patientStatsMap[p.id];
                  const status = stats?.adherenceState || { label: "Sin datos", tone: "neutral" };
                  const risk = stats?.risk || { label: "Sin evaluar", tone: "neutral" };

                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedId(p.id);
                        if (isMobile) {
                          setMobileSection("home");
                        }
                      }}
                      style={{
                        textAlign: "left",
                        borderRadius: 18,
                        padding: 14,
                        border: active
                          ? "1px solid rgba(31,59,83,0.20)"
                          : `1px solid ${BRAND.border}`,
                        background: active ? BRAND.accent : BRAND.surface,
                        cursor: "pointer",
                        transition: "0.18s ease",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "start",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 900,
                              color: BRAND.text,
                              fontSize: 14,
                              wordBreak: "break-word",
                            }}
                          >
                            {p.full_name}
                          </div>
                          <div style={{ marginTop: 6, color: BRAND.muted, fontSize: 12 }}>
                            {p.sex || "-"} • {p.height_cm ? `${p.height_cm} cm` : "altura -"}
                          </div>

                          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <SmallBadge tone={p.patient_user_id ? "success" : "neutral"}>
                              {p.patient_user_id ? "Vinculado" : "Pendiente"}
                            </SmallBadge>
                            <SmallBadge tone={risk.tone}>{risk.label}</SmallBadge>
                          </div>

                          <div style={{ marginTop: 10, display: "grid", gap: 4 }}>
                            <div style={{ fontSize: 12, color: BRAND.muted }}>
                              Adherencia 7 días: <b style={{ color: BRAND.text }}>{stats?.weeklyAverage ?? 0}%</b>
                            </div>
                            <div style={{ fontSize: 12, color: BRAND.muted }}>
                              Último registro: <b style={{ color: BRAND.text }}>{stats?.lastLogDate || "-"}</b>
                            </div>
                            <div style={{ fontSize: 12, color: BRAND.muted }}>
                              Plan más reciente: <b style={{ color: BRAND.text }}>{stats?.latestPlanWeek || "-"}</b>
                            </div>
                            <div style={{ fontSize: 12, color: BRAND.muted }}>
                              Última medición: <b style={{ color: BRAND.text }}>{stats?.latestMeasurementDate || "-"}</b>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                          <SmallBadge tone={status.tone}>{status.label}</SmallBadge>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {patients.length === 0 ? (
                  <div style={{ color: BRAND.muted, fontSize: 14 }}>
                    Aún no has creado pacientes.
                  </div>
                ) : null}
              </div>
            </Card>
          </div>
        ) : null}

        {(showHomeSection || showTrackingSection || showPlansSection) ? (
          <div style={{ display: "grid", gap: 18, minWidth: 0 }}>
            {showHomeSection ? (
              <>
                <Card
                  title="Resumen clínico del paciente"
                  subtitle={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Selecciona un paciente"}
                >
                  {!selectedPatient ? (
                    <div style={{ color: BRAND.muted }}>Selecciona un paciente.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 16 }}>
                      <div style={responsiveGrid(180)}>
                        <DataField label="Nombre" value={selectedPatient.full_name} />
                        <DataField label="Sexo" value={selectedPatient.sex} />
                        <DataField
                          label="Altura"
                          value={selectedPatient.height_cm ? `${selectedPatient.height_cm} cm` : "-"}
                        />
                        <div
                          style={{
                            background: BRAND.surfaceSoft,
                            border: `1px solid ${BRAND.border}`,
                            borderRadius: 14,
                            padding: 12,
                            minWidth: 0,
                          }}
                        >
                          <div style={{ fontSize: 12, color: BRAND.muted, fontWeight: 700 }}>Estado adherencia</div>
                          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <SmallBadge tone={adherenceStatus.tone}>{adherenceStatus.label}</SmallBadge>
                            <SmallBadge tone={selectedPatientStats?.risk?.tone || "neutral"}>
                              {selectedPatientStats?.risk?.label || "Sin evaluar"}
                            </SmallBadge>
                          </div>
                        </div>
                      </div>

                      <div style={responsiveGrid(180)}>
                        <StatCard
                          label="Adherencia 7 días"
                          value={`${selectedPatientStats?.weeklyAverage ?? weeklyAdherenceAverage}%`}
                          hint="Promedio reciente"
                        />
                        <StatCard
                          label="Plan más reciente"
                          value={selectedPatientStats?.latestPlanWeek || "-"}
                          hint="Semana publicada"
                        />
                        <StatCard
                          label="Cambio peso"
                          value={summaryWeightChange}
                          hint="Desde primera medición"
                        />
                        <StatCard
                          label="Cambio cintura"
                          value={summaryWaistChange}
                          hint="Desde primera medición"
                        />
                      </div>

                      {lastMeasurement ? (
                        <div
                          style={{
                            background: BRAND.surfaceSoft,
                            border: `1px solid ${BRAND.border}`,
                            borderRadius: 18,
                            padding: 14,
                          }}
                        >
                          <div style={{ fontWeight: 900, color: BRAND.text }}>Última medición</div>
                          <div style={{ marginTop: 4, color: BRAND.muted, fontSize: 12 }}>
                            {lastMeasurement.measured_at}
                          </div>

                          <div style={{ marginTop: 12, ...responsiveGrid(140) }}>
                            <DataField label="Peso" value={lastMeasurement.weight_kg} />
                            <DataField label="IMC" value={lastMeasurement.bmi} />
                            <DataField label="Cintura" value={lastMeasurement.waist_cm} />
                            <DataField label="% Grasa" value={lastMeasurement.bodyfat_pct} />
                            <DataField label="% Músculo" value={lastMeasurement.muscle_pct} />
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: BRAND.muted, fontSize: 14 }}>
                          Aún no hay mediciones registradas para este paciente.
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                <Card
                  title="Historia clínica"
                  subtitle={
                    selectedPatient
                      ? `Paciente: ${selectedPatient.full_name}`
                      : "Selecciona un paciente para editar"
                  }
                  action={<PrimaryButton onClick={guardarHistoriaClinica}>Guardar historia</PrimaryButton>}
                >
                  <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                    <TabButton active={activeTab === "medica"} onClick={() => setActiveTab("medica")}>
                      Médica
                    </TabButton>
                    <TabButton active={activeTab === "nutri"} onClick={() => setActiveTab("nutri")}>
                      Nutrición / Entreno
                    </TabButton>
                  </div>

                  <div
                    style={{
                      background: BRAND.surfaceSoft,
                      border: `1px solid ${BRAND.border}`,
                      borderRadius: 18,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <SectionTitle>Antropometría base</SectionTitle>

                    <div style={responsiveGrid(140)}>
                      <input placeholder="Peso kg" value={pesoBase} onChange={(e) => setPesoBase(e.target.value)} style={inputStyle} />
                      <input placeholder="% grasa" value={gcBase} onChange={(e) => setGcBase(e.target.value)} style={inputStyle} />
                      <input placeholder="% músculo" value={mmBase} onChange={(e) => setMmBase(e.target.value)} style={inputStyle} />
                      <input placeholder="Cintura cm" value={cinturaBase} onChange={(e) => setCinturaBase(e.target.value)} style={inputStyle} />
                      <input placeholder="Cadera cm" value={caderaBase} onChange={(e) => setCaderaBase(e.target.value)} style={inputStyle} />
                      <input placeholder="Pecho cm" value={pechoBase} onChange={(e) => setPechoBase(e.target.value)} style={inputStyle} />
                      <input placeholder="Brazo cm" value={brazoBase} onChange={(e) => setBrazoBase(e.target.value)} style={inputStyle} />
                      <input placeholder="Muslo cm" value={musloBase} onChange={(e) => setMusloBase(e.target.value)} style={inputStyle} />
                      <input placeholder="Pantorrilla cm" value={pantorrillaBase} onChange={(e) => setPantorrillaBase(e.target.value)} style={inputStyle} />
                    </div>

                    <div style={{ marginTop: 10, color: BRAND.muted, fontSize: 12 }}>
                      Esta parte sirve como línea base. El seguimiento real va en progreso.
                    </div>
                  </div>

                  {activeTab === "medica" ? (
                    <div style={{ display: "grid", gap: 12 }}>
                      <input placeholder="Diagnóstico / Problemas activos" value={dx} onChange={(e) => setDx(e.target.value)} style={inputStyle} />
                      <textarea
                        placeholder="Antecedentes (personales / familiares / quirúrgicos)"
                        value={antecedentes}
                        onChange={(e) => setAntecedentes(e.target.value)}
                        rows={3}
                        style={textareaStyle}
                      />
                      <input placeholder="Alergias" value={alergias} onChange={(e) => setAlergias(e.target.value)} style={inputStyle} />
                      <textarea
                        placeholder="Medicamentos actuales"
                        value={meds}
                        onChange={(e) => setMeds(e.target.value)}
                        rows={2}
                        style={textareaStyle}
                      />
                      <textarea
                        placeholder="Laboratorios / estudios relevantes"
                        value={labs}
                        onChange={(e) => setLabs(e.target.value)}
                        rows={2}
                        style={textareaStyle}
                      />
                      <textarea
                        placeholder="Notas clínicas"
                        value={notasClinicas}
                        onChange={(e) => setNotasClinicas(e.target.value)}
                        rows={3}
                        style={textareaStyle}
                      />
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                      <input
                        placeholder="Objetivo (recomposición, pérdida grasa, rendimiento...)"
                        value={objetivo}
                        onChange={(e) => setObjetivo(e.target.value)}
                        style={inputStyle}
                      />
                      <textarea
                        placeholder="Restricciones / intolerancias / alimentos no deseados"
                        value={restricciones}
                        onChange={(e) => setRestricciones(e.target.value)}
                        rows={2}
                        style={textareaStyle}
                      />
                      <textarea
                        placeholder="Gustos / alimentos frecuentes"
                        value={gustos}
                        onChange={(e) => setGustos(e.target.value)}
                        rows={2}
                        style={textareaStyle}
                      />
                      <textarea
                        placeholder="Discapacidad / lesión / limitaciones"
                        value={discapacidadLesion}
                        onChange={(e) => setDiscapacidadLesion(e.target.value)}
                        rows={2}
                        style={textareaStyle}
                      />
                      <textarea
                        placeholder="Actividad actual (gym, bici, días/sem, intensidad)"
                        value={actividad}
                        onChange={(e) => setActividad(e.target.value)}
                        rows={2}
                        style={textareaStyle}
                      />
                      <textarea
                        placeholder="Hábitos (sueño, alcohol, horarios, hambre, ansiedad)"
                        value={habitos}
                        onChange={(e) => setHabitos(e.target.value)}
                        rows={2}
                        style={textareaStyle}
                      />
                      <textarea
                        placeholder="Notas nutricionales"
                        value={notasNutri}
                        onChange={(e) => setNotasNutri(e.target.value)}
                        rows={3}
                        style={textareaStyle}
                      />
                    </div>
                  )}
                </Card>
              </>
            ) : null}

            {showTrackingSection ? (
              <>
                <Card
                  title="Adherencia"
                  subtitle="Seguimiento del cumplimiento diario del paciente"
                  action={<SecondaryButton onClick={() => selectedId && loadAdherence(selectedId)}>Recargar</SecondaryButton>}
                >
                  <div style={responsiveGrid(180)}>
                    <StatCard label="Adherencia hoy" value={`${todayAdherencePercent}%`} hint={todayISO()} />
                    <StatCard label="Promedio 7 días" value={`${weeklyAdherenceAverage}%`} hint="Última semana" />
                    <StatCard label="Último registro" value={lastAdherenceLog?.log_date || "-"} hint="Actividad reciente" />
                    <StatCard
                      label="Riesgo"
                      value={selectedPatientStats?.risk?.label || "Sin evaluar"}
                      hint="Basado en adherencia y recencia"
                    />
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <SectionTitle>Detalle del día de hoy</SectionTitle>

                    {!todayAdherence ? (
                      <div
                        style={{
                          background: BRAND.surfaceSoft,
                          border: `1px solid ${BRAND.border}`,
                          borderRadius: 18,
                          padding: 16,
                          color: BRAND.muted,
                        }}
                      >
                        No hay registro de adherencia para hoy.
                      </div>
                    ) : (
                      <div style={responsiveGrid(140)}>
                        <DataField label="Desayuno" value={todayAdherence.breakfast_ok ? "✔" : "✘"} />
                        <DataField label="Snack 1" value={todayAdherence.snack1_ok ? "✔" : "✘"} />
                        <DataField label="Almuerzo" value={todayAdherence.lunch_ok ? "✔" : "✘"} />
                        <DataField label="Snack 2" value={todayAdherence.snack2_ok ? "✔" : "✘"} />
                        <DataField label="Cena" value={todayAdherence.dinner_ok ? "✔" : "✘"} />
                        <DataField label="Entrenamiento" value={todayAdherence.workout_ok ? "✔" : "✘"} />
                        <DataField label="Agua" value={todayAdherence.water_ok ? "✔" : "✘"} />
                        <DataField label="Pasos" value={todayAdherence.steps_ok ? "✔" : "✘"} />
                        <DataField label="Sueño" value={todayAdherence.sleep_ok ? "✔" : "✘"} />
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <SectionTitle>Últimos 7 días</SectionTitle>

                    <div
                      style={{
                        overflowX: "auto",
                        border: `1px solid ${BRAND.border}`,
                        borderRadius: 18,
                        background: "#fff",
                      }}
                    >
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 980 }}>
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            {["Fecha", "%", "Des", "S1", "Alm", "S2", "Cena", "Ent", "Agua", "Pasos", "Sueño", "Notas"].map((h) => (
                              <th
                                key={h}
                                style={{
                                  textAlign: "left",
                                  padding: 14,
                                  borderBottom: `1px solid ${BRAND.border}`,
                                  fontWeight: 900,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {weekAdherence.map((row) => (
                            <tr key={row.id}>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{row.log_date}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>
                                {computeAdherencePercent(row)}%
                              </td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{row.breakfast_ok ? "✔" : "✘"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{row.snack1_ok ? "✔" : "✘"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{row.lunch_ok ? "✔" : "✘"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{row.snack2_ok ? "✔" : "✘"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{row.dinner_ok ? "✔" : "✘"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{row.workout_ok ? "✔" : "✘"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{row.water_ok ? "✔" : "✘"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{row.steps_ok ? "✔" : "✘"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{row.sleep_ok ? "✔" : "✘"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}`, maxWidth: 260 }}>
                                <div style={{ whiteSpace: "pre-wrap" }}>{row.notes || "-"}</div>
                              </td>
                            </tr>
                          ))}

                          {weekAdherence.length === 0 ? (
                            <tr>
                              <td colSpan={12} style={{ padding: 18, color: BRAND.muted }}>
                                No hay registros de adherencia recientes.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>

                <Card
                  title="Progreso"
                  subtitle="Registro de mediciones, análisis y evolución"
                  action={<SecondaryButton onClick={() => selectedId && loadProgress(selectedId)}>Recargar</SecondaryButton>}
                >
                  <div
                    style={{
                      background: BRAND.surfaceSoft,
                      border: `1px solid ${BRAND.border}`,
                      borderRadius: 18,
                      padding: 16,
                    }}
                  >
                    <SectionTitle>Nueva medición</SectionTitle>

                    <div style={responsiveGrid(180)}>
                      <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} style={inputStyle} />
                      <input placeholder="Peso kg" value={mWeight} onChange={(e) => setMWeight(e.target.value)} style={inputStyle} />
                      <input placeholder="Talla cm (opcional)" value={mHeight} onChange={(e) => setMHeight(e.target.value)} style={inputStyle} />
                      <input
                        placeholder="IMC"
                        value={calcBMI(mWeight, mHeight || selectedPatient?.height_cm || "") ?? ""}
                        readOnly
                        style={{ ...inputStyle, background: "#fff" }}
                      />
                    </div>

                    <div style={{ marginTop: 12, ...responsiveGrid(180) }}>
                      <input placeholder="Cintura cm" value={mWaist} onChange={(e) => setMWaist(e.target.value)} style={inputStyle} />
                      <input placeholder="Cadera cm" value={mHip} onChange={(e) => setMHip(e.target.value)} style={inputStyle} />
                      <input placeholder="Pecho cm" value={mChest} onChange={(e) => setMChest(e.target.value)} style={inputStyle} />
                      <input placeholder="Brazo cm" value={mArm} onChange={(e) => setMArm(e.target.value)} style={inputStyle} />
                      <input placeholder="Muslo cm" value={mThigh} onChange={(e) => setMThigh(e.target.value)} style={inputStyle} />
                      <input placeholder="Pantorrilla cm" value={mCalf} onChange={(e) => setMCalf(e.target.value)} style={inputStyle} />
                      <input placeholder="% grasa" value={mFat} onChange={(e) => setMFat(e.target.value)} style={inputStyle} />
                      <input placeholder="% músculo" value={mMuscle} onChange={(e) => setMMuscle(e.target.value)} style={inputStyle} />
                    </div>

                    <textarea
                      placeholder="Notas"
                      value={mNotes}
                      onChange={(e) => setMNotes(e.target.value)}
                      rows={2}
                      style={{ ...textareaStyle, marginTop: 12 }}
                    />

                    <div style={{ marginTop: 12 }}>
                      <PrimaryButton onClick={addMeasurement}>Guardar medición</PrimaryButton>
                    </div>
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <SectionTitle>Análisis automático</SectionTitle>
                    <div
                      style={{
                        background: BRAND.surfaceSoft,
                        border: `1px solid ${BRAND.border}`,
                        borderRadius: 18,
                        padding: 16,
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      {measurementInsights.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: 12,
                            background: "#fff",
                            borderRadius: 14,
                            border: `1px solid ${BRAND.border}`,
                            color: "#334155",
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <SectionTitle>Gráficos de progreso</SectionTitle>
                    <div
                      style={{
                        background: BRAND.surfaceSoft,
                        border: `1px solid ${BRAND.border}`,
                        borderRadius: 18,
                        padding: 16,
                        overflowX: "auto",
                      }}
                    >
                      <ProgressCharts data={progressDataAsc} />
                    </div>
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <SectionTitle>Tabla de progreso</SectionTitle>
                    <div
                      style={{
                        overflowX: "auto",
                        border: `1px solid ${BRAND.border}`,
                        borderRadius: 18,
                        background: "#fff",
                      }}
                    >
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1100 }}>
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            {["Fecha", "Peso", "IMC", "Cintura", "Cadera", "Pecho", "Brazo", "Muslo", "Pant.", "%Grasa", "%Músculo", "Acciones"].map(
                              (h) => (
                                <th
                                  key={h}
                                  style={{
                                    textAlign: "left",
                                    padding: 14,
                                    borderBottom: `1px solid ${BRAND.border}`,
                                    color: BRAND.text,
                                    fontWeight: 900,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {progressRows.map((r) => (
                            <tr key={r.id}>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{r.measured_at}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{r.weight_kg ?? "-"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{r.bmi ?? "-"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{r.waist_cm ?? "-"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{r.hip_cm ?? "-"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{r.chest_cm ?? "-"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{r.arm_cm ?? "-"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{r.thigh_cm ?? "-"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{r.calf_cm ?? "-"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{r.bodyfat_pct ?? "-"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>{r.muscle_pct ?? "-"}</td>
                              <td style={{ padding: 14, borderBottom: `1px solid ${BRAND.border}` }}>
                                <button
                                  onClick={() => deleteMeasurement(r.id)}
                                  style={{
                                    padding: "9px 12px",
                                    borderRadius: 12,
                                    cursor: "pointer",
                                    border: "1px solid rgba(220,38,38,0.18)",
                                    background: "#fff",
                                    color: "#991b1b",
                                    fontWeight: 900,
                                  }}
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}

                          {progressRows.length === 0 ? (
                            <tr>
                              <td colSpan={12} style={{ padding: 18, color: BRAND.muted }}>
                                Aún no hay mediciones registradas.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              </>
            ) : null}

            {showPlansSection ? (
              <Card title="Plan semanal" subtitle="Publica plan nutricional y entrenamiento por días">
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ color: BRAND.muted, fontSize: 13, fontWeight: 700 }}>Inicio de semana:</div>
                  <input
                    type="date"
                    value={weekStart}
                    onChange={(e) => handleWeekStartChange(e.target.value)}
                    style={{ ...inputStyle, width: 180 }}
                  />
                  <SmallBadge>Lunes real: {getMondayFromDate(weekStart)}</SmallBadge>

                  <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <TabButton active={planMode === "v2"} onClick={() => setPlanMode("v2")}>
                      Tabla profesional
                    </TabButton>
                    <TabButton active={planMode === "text"} onClick={() => setPlanMode("text")}>
                      Texto libre
                    </TabButton>
                  </div>
                </div>

                {planMode === "v2" ? (
                  <div>
                    <SectionTitle
                      right={<SecondaryButton onClick={resetPlanV2}>Limpiar plan</SecondaryButton>}
                    >
                      Plan organizado por días y comidas
                    </SectionTitle>

                    <div
                      style={{
                        overflowX: "auto",
                        border: `1px solid ${BRAND.border}`,
                        borderRadius: 18,
                        background: "#fff",
                      }}
                    >
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1500 }}>
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            {["Día", "Desayuno", "Snack 1", "Almuerzo", "Snack 2", "Cena", "Entrenamiento", "Notas"].map(
                              (h) => (
                                <th
                                  key={h}
                                  style={{
                                    textAlign: "left",
                                    padding: 14,
                                    borderBottom: `1px solid ${BRAND.border}`,
                                    fontWeight: 900,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {planV2.days.map((row, i) => (
                            <tr key={row.day}>
                              <td
                                style={{
                                  padding: 14,
                                  borderBottom: `1px solid ${BRAND.border}`,
                                  fontWeight: 900,
                                  minWidth: 120,
                                  verticalAlign: "top",
                                  background: "#fcfdff",
                                }}
                              >
                                {row.day}
                              </td>

                              {["breakfast", "snack1", "lunch", "snack2", "dinner", "training", "notes"].map((key) => (
                                <td
                                  key={key}
                                  style={{
                                    padding: 10,
                                    borderBottom: `1px solid ${BRAND.border}`,
                                    verticalAlign: "top",
                                  }}
                                >
                                  <textarea
                                    value={row[key]}
                                    onChange={(e) => updatePlanV2Cell(i, key, e.target.value)}
                                    rows={4}
                                    style={{
                                      width: 220,
                                      padding: 10,
                                      borderRadius: 12,
                                      border: `1px solid ${BRAND.border}`,
                                      fontFamily: "inherit",
                                      resize: "vertical",
                                      boxSizing: "border-box",
                                    }}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <textarea
                      placeholder="Notas generales de la semana"
                      value={planV2.generalNotes}
                      onChange={(e) => setPlanV2((p) => ({ ...p, generalNotes: e.target.value }))}
                      rows={3}
                      style={{ ...textareaStyle, marginTop: 12 }}
                    />
                  </div>
                ) : (
                  <div>
                    <SectionTitle>Plan en texto</SectionTitle>
                    <textarea
                      value={planText}
                      onChange={(e) => setPlanText(e.target.value)}
                      rows={12}
                      style={textareaStyle}
                    />
                  </div>
                )}

                <div style={{ marginTop: 16 }}>
                  <PrimaryButton onClick={guardarPlanSemanal}>Publicar plan</PrimaryButton>
                </div>
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>

      {isMobile ? (
        <div
          style={{
            position: "fixed",
            left: 12,
            right: 12,
            bottom: 12,
            zIndex: 999,
            background: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${BRAND.border}`,
            borderRadius: 22,
            boxShadow: "0 10px 30px rgba(15,23,42,0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 4px",
          }}
        >
          <MobileNavButton
            active={mobileSection === "home"}
            icon="🏠"
            label="Inicio"
            onClick={() => setMobileSection("home")}
          />
          <MobileNavButton
            active={mobileSection === "patients"}
            icon="👥"
            label="Pacientes"
            onClick={() => setMobileSection("patients")}
          />
          <MobileNavButton
            active={mobileSection === "tracking"}
            icon="📈"
            label="Seguimiento"
            onClick={() => setMobileSection("tracking")}
          />
          <MobileNavButton
            active={mobileSection === "plans"}
            icon="🗓️"
            label="Planes"
            onClick={() => setMobileSection("plans")}
          />
        </div>
      ) : null}

      <style>{`
        @media (max-width: 1024px) {
          .doctor-sidebar {
            position: static !important;
            top: auto !important;
          }
        }

        @media (max-width: 1100px) {
          .doctor-main-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </PageShell>
  );
}