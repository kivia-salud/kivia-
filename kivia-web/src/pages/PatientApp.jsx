import { useEffect, useMemo, useRef, useState } from "react";
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
  successBg: "#f0fff4",
  successBorder: "#2f855a",
  successText: "#22543d",
  successSoft: "#ecfdf3",
  warningBg: "#fffbeb",
  warningText: "#92400e",
  dangerBg: "#fff5f5",
  dangerBorder: "#dc2626",
  dangerText: "#8a0b0b",
};

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function toISODate(date) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 10);
}

function todayISO() {
  return toISODate(new Date());
}

function getMondayFromDate(dateInput) {
  const d = new Date(dateInput);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return toISODate(d);
}

function getDayIndexFromDate(dateInput) {
  const d = new Date(dateInput);
  const jsDay = d.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function getDayNameFromDate(dateInput) {
  return DAY_NAMES[getDayIndexFromDate(dateInput)];
}

function formatDatePretty(dateStr) {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString("es-EC", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return dateStr;
  }
}

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  const diff = Math.abs(b - a);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
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

function adherenceDoneCount(log) {
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

  return fields.filter((key) => !!log[key]).length;
}

function buildWeeklyAverage(logs = []) {
  if (!logs.length) return 0;
  const values = logs.map((log) => computeAdherencePercent(log));
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function emptyAdherenceLog() {
  return {
    breakfast_ok: false,
    snack1_ok: false,
    lunch_ok: false,
    snack2_ok: false,
    dinner_ok: false,
    workout_ok: false,
    water_ok: false,
    steps_ok: false,
    sleep_ok: false,
    notes: "",
  };
}

function PageShell({ children, isMobile = false }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #e9f0f5 0%, #eef3f7 220px, #f5f8fb 100%)",
        padding: "clamp(12px, 2vw, 24px)",
        paddingBottom: isMobile ? "96px" : "24px",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>{children}</div>
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

function QuickNavButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 999,
        border: `1px solid ${BRAND.border}`,
        background: BRAND.surface,
        color: BRAND.text,
        fontWeight: 800,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function MobileNavButton({ label, icon, active, onClick }) {
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

function MobileBottomNav({ activeSection, onToday, onAdherence, onWeek, onProgress }) {
  return (
    <div className="mobile-bottom-nav">
      <MobileNavButton label="Hoy" icon="☀️" active={activeSection === "today"} onClick={onToday} />
      <MobileNavButton label="Check" icon="✅" active={activeSection === "adherence"} onClick={onAdherence} />
      <MobileNavButton label="Semana" icon="🗓️" active={activeSection === "week"} onClick={onWeek} />
      <MobileNavButton label="Progreso" icon="📈" active={activeSection === "progress"} onClick={onProgress} />
    </div>
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

function AdherenceToggle({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: 16,
        borderRadius: 18,
        border: active
          ? "1px solid rgba(22,101,52,0.15)"
          : `1px solid ${BRAND.border}`,
        background: active ? BRAND.successSoft : "#fff",
        color: active ? "#166534" : BRAND.text,
        fontWeight: 800,
        cursor: "pointer",
        transition: "0.18s ease",
        boxShadow: active ? "0 8px 20px rgba(22,101,52,0.08)" : "none",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 14, wordBreak: "break-word" }}>{label}</div>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            background: active ? "#16a34a" : "#e2e8f0",
            color: active ? "white" : "#64748b",
            fontSize: 14,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          {active ? "✓" : "•"}
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82 }}>
        {active ? "Completado" : "Pendiente"}
      </div>
    </button>
  );
}

function DayPlanItem({ label, value }) {
  return (
    <div
      style={{
        background: BRAND.surfaceSoft,
        border: `1px solid ${BRAND.border}`,
        borderRadius: 16,
        padding: 14,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 12, color: BRAND.muted, fontWeight: 800 }}>{label}</div>
      <div
        style={{
          marginTop: 8,
          color: BRAND.text,
          fontWeight: 800,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function ProgressBar({ percent }) {
  return (
    <div
      style={{
        width: "100%",
        height: 12,
        borderRadius: 999,
        background: "#e2e8f0",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${percent}%`,
          height: "100%",
          borderRadius: 999,
          background: "linear-gradient(90deg, #1f3b53 0%, #5ba878 100%)",
          transition: "width 0.25s ease",
        }}
      />
    </div>
  );
}

const responsiveGrid = (min = 220) => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`,
  gap: 12,
});

export default function PatientApp() {
  const nav = useNavigate();

  const sectionTodayRef = useRef(null);
  const sectionAdherenceRef = useRef(null);
  const sectionWeekRef = useRef(null);
  const sectionProgressRef = useRef(null);

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState(null);

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [profile, setProfile] = useState(null);

  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [progressRows, setProgressRows] = useState([]);

  const [adherenceDate, setAdherenceDate] = useState(todayISO());
  const [adherenceLog, setAdherenceLog] = useState(emptyAdherenceLog());
  const [weekAdherence, setWeekAdherence] = useState([]);
  const [savingAdherence, setSavingAdherence] = useState(false);

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  const [mobileSection, setMobileSection] = useState("today");

  const selectedWeekLabel = useMemo(() => {
    if (!selectedWeek) return "";
    return `Semana desde ${selectedWeek}`;
  }, [selectedWeek]);

  const activeDayName = useMemo(() => getDayNameFromDate(adherenceDate), [adherenceDate]);
  const activeWeekFromDate = useMemo(() => getMondayFromDate(adherenceDate), [adherenceDate]);

  const progressDataAsc = useMemo(() => {
    return [...progressRows].sort(
      (a, b) => new Date(a.measured_at) - new Date(b.measured_at)
    );
  }, [progressRows]);

  const measurementInsights = useMemo(() => {
    return buildMeasurementInsights(progressRows);
  }, [progressRows]);

  const latestMeasurement = useMemo(() => {
    if (!progressRows.length) return null;
    return [...progressRows].sort(
      (a, b) => new Date(b.measured_at) - new Date(a.measured_at)
    )[0];
  }, [progressRows]);

  const initialMeasurement = useMemo(() => {
    if (!progressRows.length) return null;
    return [...progressRows].sort(
      (a, b) => new Date(a.measured_at) - new Date(b.measured_at)
    )[0];
  }, [progressRows]);

  const weightChange = useMemo(() => {
    if (!latestMeasurement?.weight_kg || !initialMeasurement?.weight_kg) return "-";
    const diff = Number(latestMeasurement.weight_kg) - Number(initialMeasurement.weight_kg);
    if (diff === 0) return "0 kg";
    return `${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg`;
  }, [latestMeasurement, initialMeasurement]);

  const waistChange = useMemo(() => {
    if (!latestMeasurement?.waist_cm || !initialMeasurement?.waist_cm) return "-";
    const diff = Number(latestMeasurement.waist_cm) - Number(initialMeasurement.waist_cm);
    if (diff === 0) return "0 cm";
    return `${diff > 0 ? "+" : ""}${diff.toFixed(1)} cm`;
  }, [latestMeasurement, initialMeasurement]);

  const todayAdherencePercent = useMemo(() => {
    return computeAdherencePercent(adherenceLog);
  }, [adherenceLog]);

  const adherenceDone = useMemo(() => {
    return adherenceDoneCount(adherenceLog);
  }, [adherenceLog]);

  const weeklyAdherenceAverage = useMemo(() => {
    return buildWeeklyAverage(weekAdherence);
  }, [weekAdherence]);

  const lastAdherenceDate = useMemo(() => {
    if (!weekAdherence.length) return null;
    return [...weekAdherence].sort((a, b) => new Date(b.log_date) - new Date(a.log_date))[0]
      .log_date;
  }, [weekAdherence]);

  const adherenceStatus = useMemo(() => {
    if (!lastAdherenceDate) return { label: "Sin registros", tone: "neutral" };
    const days = daysBetween(lastAdherenceDate, todayISO());
    if (days === 0) return { label: "Al día", tone: "success" };
    if (days <= 2) return { label: `Último registro hace ${days} día(s)`, tone: "warning" };
    return { label: `Sin registrar hace ${days} días`, tone: "warning" };
  }, [lastAdherenceDate]);

  const plan = selectedPlan?.plan || null;

  const todayStructuredDay = useMemo(() => {
    if (!plan || plan.type !== "structured_v2" || !Array.isArray(plan.days)) return null;
    return plan.days.find((d) => d.day === activeDayName) || null;
  }, [plan, activeDayName]);

  const showTodaySection = !isMobile || mobileSection === "today";
  const showAdherenceSection = !isMobile || mobileSection === "adherence";
  const showWeekSection = !isMobile || mobileSection === "week";
  const showProgressSection = !isMobile || mobileSection === "progress";

  const scrollToRef = (ref) => {
    ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const loadProfile = async (uid) => {
    const { data, error } = await supabase
      .from("patient_profiles")
      .select("id, full_name, sex, height_cm, doctor_user_id, patient_user_id")
      .eq("patient_user_id", uid)
      .maybeSingle();

    if (error) setErr(error.message);
    return data || null;
  };

  const loadWeeks = async (profileId) => {
    const { data, error } = await supabase
      .from("weekly_plans")
      .select("id, week_start, updated_at")
      .eq("patient_profile_id", profileId)
      .order("week_start", { ascending: false });

    if (error) {
      setErr(error.message);
      return [];
    }

    return data || [];
  };

  const loadPlanForWeek = async (profileId, weekStart) => {
    const { data, error } = await supabase
      .from("weekly_plans")
      .select("id, week_start, plan, updated_at")
      .eq("patient_profile_id", profileId)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (error) {
      setErr(error.message);
      return null;
    }

    return data || null;
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
      return [];
    }

    setProgressRows(data || []);
    return data || [];
  };

  const loadAdherenceForDate = async (profileId, date) => {
    const { data, error } = await supabase
      .from("daily_adherence_logs")
      .select("*")
      .eq("patient_profile_id", profileId)
      .eq("log_date", date)
      .maybeSingle();

    if (error) {
      setErr(error.message);
      return null;
    }

    if (!data) {
      const empty = emptyAdherenceLog();
      setAdherenceLog(empty);
      return empty;
    }

    const normalized = {
      breakfast_ok: !!data.breakfast_ok,
      snack1_ok: !!data.snack1_ok,
      lunch_ok: !!data.lunch_ok,
      snack2_ok: !!data.snack2_ok,
      dinner_ok: !!data.dinner_ok,
      workout_ok: !!data.workout_ok,
      water_ok: !!data.water_ok,
      steps_ok: !!data.steps_ok,
      sleep_ok: !!data.sleep_ok,
      notes: data.notes || "",
    };

    setAdherenceLog(normalized);
    return normalized;
  };

  const loadWeekAdherence = async (profileId) => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const startDate = toISODate(start);

    const { data, error } = await supabase
      .from("daily_adherence_logs")
      .select("*")
      .eq("patient_profile_id", profileId)
      .gte("log_date", startDate)
      .order("log_date", { ascending: false });

    if (error) {
      setErr(error.message);
      return [];
    }

    setWeekAdherence(data || []);
    return data || [];
  };

  const syncPlanForDate = async (profileId, date, weeksList = weeks) => {
    if (!profileId) return;

    const monday = getMondayFromDate(date);
    const exists = (weeksList || []).find((w) => w.week_start === monday);

    if (exists) {
      setSelectedWeek(monday);
      const p = await loadPlanForWeek(profileId, monday);
      setSelectedPlan(p);
      return;
    }

    if ((weeksList || []).length > 0) {
      setSelectedWeek(weeksList[0].week_start);
      const p = await loadPlanForWeek(profileId, weeksList[0].week_start);
      setSelectedPlan(p);
      return;
    }

    setSelectedWeek("");
    setSelectedPlan(null);
  };

  useEffect(() => {
    (async () => {
      setErr("");

      const { data } = await supabase.auth.getSession();
      if (!data.session) return nav("/login", { replace: true });

      setEmail(data.session.user.email || "");
      setUserId(data.session.user.id);

      const { data: doctorRow } = await supabase
        .from("doctors")
        .select("user_id")
        .eq("user_id", data.session.user.id)
        .maybeSingle();

      if (doctorRow?.user_id) return nav("/doctor", { replace: true });

      const prof = await loadProfile(data.session.user.id);

      if (prof?.id) {
        setProfile(prof);
        await loadProgress(prof.id);
        await loadAdherenceForDate(prof.id, todayISO());
        await loadWeekAdherence(prof.id);

        const w = await loadWeeks(prof.id);
        setWeeks(w);
        await syncPlanForDate(prof.id, todayISO(), w);
      }
    })();
  }, [nav]);

  useEffect(() => {
    if (!profile?.id || !adherenceDate) return;

    loadAdherenceForDate(profile.id, adherenceDate);
    syncPlanForDate(profile.id, adherenceDate);
  }, [adherenceDate, profile?.id]);

  const salir = async () => {
    await supabase.auth.signOut();
    nav("/login", { replace: true });
  };

const vincular = async () => {
  setErr("");
  setMsg("");

  const clean = code.trim().toUpperCase();

  if (!clean.startsWith("KIV-") || clean.length < 8) {
    return setErr("Código inválido. Debe ser como KIV-ABC123.");
  }

  if (!userId) return setErr("No hay sesión.");

  const { data: updatedProfile, error } = await supabase.rpc("claim_patient_invite", {
    invite_code: clean,
  });

  if (error) {
    const message = error.message || "";
    if (message.includes("Código no existe")) return setErr("Ese código no existe.");
    if (message.includes("ya fue usado")) return setErr("Ese código ya fue usado.");
    if (message.includes("ya está vinculado")) return setErr("Ese perfil ya está vinculado.");
    return setErr(message);
  }

  if (!updatedProfile?.id) {
    return setErr("No se pudo vincular la cuenta.");
  }

  setProfile(updatedProfile);
  await loadProgress(updatedProfile.id);
  await loadAdherenceForDate(updatedProfile.id, todayISO());
  await loadWeekAdherence(updatedProfile.id);

  const w = await loadWeeks(updatedProfile.id);
  setWeeks(w);
  await syncPlanForDate(updatedProfile.id, todayISO(), w);

  setMsg("✅ Listo. Tu cuenta ya está vinculada.");

  if (isMobile) {
    setMobileSection("today");
  }
};

  const onPickWeek = async (weekStart) => {
    setErr("");
    setSelectedWeek(weekStart);
    setSelectedPlan(null);

    if (!profile?.id) return;

    const p = await loadPlanForWeek(profile.id, weekStart);
    setSelectedPlan(p);

    if (isMobile) {
      setMobileSection("week");
    }
  };

  const toggleAdherence = (key) => {
    setAdherenceLog((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveAdherence = async () => {
    if (!profile?.id) return;

    setSavingAdherence(true);
    setErr("");
    setMsg("");

    const payload = {
      patient_profile_id: profile.id,
      log_date: adherenceDate,
      breakfast_ok: !!adherenceLog.breakfast_ok,
      snack1_ok: !!adherenceLog.snack1_ok,
      lunch_ok: !!adherenceLog.lunch_ok,
      snack2_ok: !!adherenceLog.snack2_ok,
      dinner_ok: !!adherenceLog.dinner_ok,
      workout_ok: !!adherenceLog.workout_ok,
      water_ok: !!adherenceLog.water_ok,
      steps_ok: !!adherenceLog.steps_ok,
      sleep_ok: !!adherenceLog.sleep_ok,
      notes: adherenceLog.notes || "",
    };

    const { error } = await supabase
      .from("daily_adherence_logs")
      .upsert(payload, { onConflict: "patient_profile_id,log_date" });

    setSavingAdherence(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setMsg("✅ Adherencia guardada.");
    await loadAdherenceForDate(profile.id, adherenceDate);
    await loadWeekAdherence(profile.id);

    if (isMobile) {
      setMobileSection("adherence");
    }
  };

  const renderTodayPlan = () => {
    if (!weeks.length) {
      return <div style={{ color: BRAND.muted }}>Aún no tienes plan publicado.</div>;
    }

    if (!selectedPlan) {
      return <div style={{ color: BRAND.muted }}>Cargando plan...</div>;
    }

    if (!plan) {
      return <div style={{ color: BRAND.muted }}>No hay contenido de plan.</div>;
    }

    if (plan.type === "structured_v2" && todayStructuredDay) {
      return (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              background: "linear-gradient(135deg, #f8fbfd 0%, #eef5f9 100%)",
              border: `1px solid ${BRAND.border}`,
              borderRadius: 22,
              padding: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "clamp(22px, 4vw, 24px)", fontWeight: 900, color: BRAND.text }}>
                  {activeDayName}
                </div>
                <div style={{ marginTop: 4, color: BRAND.muted, fontSize: 13 }}>
                  {formatDatePretty(adherenceDate)} • {selectedWeekLabel}
                </div>
              </div>

              <SmallBadge tone={activeWeekFromDate === selectedWeek ? "success" : "warning"}>
                {activeWeekFromDate === selectedWeek ? "Plan de esta semana" : "Revisando otra semana"}
              </SmallBadge>
            </div>

            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 8,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontWeight: 800, color: BRAND.text }}>Progreso del día</div>
                <div style={{ color: BRAND.muted, fontSize: 13, fontWeight: 800 }}>
                  {adherenceDone}/9 completado
                </div>
              </div>
              <ProgressBar percent={todayAdherencePercent} />
              <div style={{ marginTop: 8, color: BRAND.muted, fontSize: 13 }}>
                {todayAdherencePercent}% de cumplimiento
              </div>
            </div>
          </div>

          <div style={responsiveGrid(220)}>
            <DayPlanItem label="Desayuno" value={todayStructuredDay.breakfast} />
            <DayPlanItem label="Snack 1" value={todayStructuredDay.snack1} />
            <DayPlanItem label="Almuerzo" value={todayStructuredDay.lunch} />
            <DayPlanItem label="Snack 2" value={todayStructuredDay.snack2} />
            <DayPlanItem label="Cena" value={todayStructuredDay.dinner} />
            <DayPlanItem label="Entrenamiento" value={todayStructuredDay.training} />
          </div>

          <DayPlanItem label="Notas del día" value={todayStructuredDay.notes} />

          {plan.generalNotes ? (
            <DayPlanItem label="Notas generales de la semana" value={plan.generalNotes} />
          ) : null}
        </div>
      );
    }

    if (plan.type === "text_v1") {
      return (
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          <div style={{ color: BRAND.muted, fontSize: 13, marginBottom: 10 }}>
            {selectedWeekLabel}
          </div>
          {plan.text || ""}
        </div>
      );
    }

    return (
      <div style={{ color: BRAND.muted }}>
        El plan existe, pero no tiene un formato compatible.
      </div>
    );
  };

  const renderWeekOverview = () => {
    if (!plan || plan.type !== "structured_v2" || !Array.isArray(plan.days)) {
      return <div style={{ color: BRAND.muted }}>No hay resumen semanal estructurado.</div>;
    }

    return (
      <div style={{ display: "grid", gap: 12 }}>
        {plan.days.map((day) => (
          <div
            key={day.day}
            style={{
              border: `1px solid ${BRAND.border}`,
              borderRadius: 18,
              background: day.day === activeDayName ? BRAND.accent : BRAND.surfaceSoft,
              padding: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontWeight: 900, color: BRAND.text }}>{day.day}</div>
              {day.day === activeDayName ? <SmallBadge>Hoy</SmallBadge> : null}
            </div>

            <div style={{ marginTop: 10, ...responsiveGrid(180) }}>
              <DataField label="Desayuno" value={day.breakfast} />
              <DataField label="Snack 1" value={day.snack1} />
              <DataField label="Almuerzo" value={day.lunch} />
              <DataField label="Snack 2" value={day.snack2} />
              <DataField label="Cena" value={day.dinner} />
              <DataField label="Entrenamiento" value={day.training} />
            </div>

            {day.notes ? (
              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  borderRadius: 14,
                  background: "#fff",
                  border: `1px solid ${BRAND.border}`,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                <div style={{ fontSize: 12, color: BRAND.muted, fontWeight: 800 }}>Notas</div>
                <div style={{ marginTop: 6, color: BRAND.text, fontWeight: 700 }}>{day.notes}</div>
              </div>
            ) : null}
          </div>
        ))}

        {plan.generalNotes ? (
          <div
            style={{
              padding: 14,
              borderRadius: 18,
              background: BRAND.surfaceSoft,
              border: `1px solid ${BRAND.border}`,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8, color: BRAND.text }}>
              Notas generales
            </div>
            {plan.generalNotes}
          </div>
        ) : null}
      </div>
    );
  };

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
              KiviA Paciente
            </div>
            <div style={{ marginTop: 6, fontSize: 14, opacity: 0.9 }}>
              Tu plan diario, tu progreso y tu adherencia en un solo lugar.
            </div>
            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85, wordBreak: "break-word" }}>{email}</div>
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

      {!profile ? (
        <div style={{ marginTop: 18, maxWidth: 560 }}>
          <Card title="Vincular mi cuenta" subtitle="Ingresa el código que te dio tu médico">
            <div style={{ display: "grid", gap: 12 }}>
              <input
                placeholder="KIV-XXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={inputStyle}
              />

              <PrimaryButton onClick={vincular}>Vincular</PrimaryButton>
            </div>
          </Card>
        </div>
      ) : (
        <div style={{ marginTop: 18, display: "grid", gap: 18 }}>
          {showTodaySection ? (
            <div style={responsiveGrid(180)}>
              <StatCard label="Mi día" value={activeDayName} hint={formatDatePretty(adherenceDate)} />
              <StatCard label="Completado" value={`${adherenceDone}/9`} hint="Checklist diario" />
              <StatCard label="Adherencia" value={`${todayAdherencePercent}%`} hint={adherenceDate} />
              <StatCard label="Promedio 7 días" value={`${weeklyAdherenceAverage}%`} hint="Última semana" />
            </div>
          ) : null}

          {!isMobile ? (
            <div
              className="patient-top-chips"
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                overflowX: "auto",
                paddingBottom: 4,
              }}
            >
              <QuickNavButton label="Hoy" onClick={() => scrollToRef(sectionTodayRef)} />
              <QuickNavButton label="Adherencia" onClick={() => scrollToRef(sectionAdherenceRef)} />
              <QuickNavButton label="Semana" onClick={() => scrollToRef(sectionWeekRef)} />
              <QuickNavButton label="Progreso" onClick={() => scrollToRef(sectionProgressRef)} />
            </div>
          ) : null}

          <div
            className="patient-main-layout"
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 320px) minmax(0, 1fr)",
              gap: 18,
              alignItems: "start",
            }}
          >
            {!isMobile ? (
              <div
                className="patient-sidebar"
                style={{ display: "grid", gap: 18, position: "sticky", top: 20 }}
              >
                <Card title="Mi perfil" subtitle="Resumen rápido">
                  <div style={{ display: "grid", gap: 12 }}>
                    <DataField label="Nombre" value={profile.full_name} />
                    <DataField label="Sexo" value={profile.sex} />
                    <DataField
                      label="Altura"
                      value={profile.height_cm ? `${profile.height_cm} cm` : "-"}
                    />
                    <div
                      style={{
                        background: BRAND.surfaceSoft,
                        border: `1px solid ${BRAND.border}`,
                        borderRadius: 14,
                        padding: 12,
                      }}
                    >
                      <div style={{ fontSize: 12, color: BRAND.muted, fontWeight: 700 }}>Estado adherencia</div>
                      <div style={{ marginTop: 8 }}>
                        <SmallBadge tone={adherenceStatus.tone}>{adherenceStatus.label}</SmallBadge>
                      </div>
                    </div>
                  </div>

                  {latestMeasurement ? (
                    <div
                      style={{
                        marginTop: 14,
                        background: BRAND.surfaceSoft,
                        border: `1px solid ${BRAND.border}`,
                        borderRadius: 18,
                        padding: 14,
                      }}
                    >
                      <div style={{ fontWeight: 900, marginBottom: 8 }}>Última medición</div>
                      <div style={{ fontSize: 12, color: BRAND.muted, marginBottom: 10 }}>
                        {latestMeasurement.measured_at}
                      </div>

                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 14 }}>Peso: <b>{latestMeasurement.weight_kg ?? "-"}</b></div>
                        <div style={{ fontSize: 14 }}>IMC: <b>{latestMeasurement.bmi ?? "-"}</b></div>
                        <div style={{ fontSize: 14 }}>Cintura: <b>{latestMeasurement.waist_cm ?? "-"}</b></div>
                        <div style={{ fontSize: 14 }}>% grasa: <b>{latestMeasurement.bodyfat_pct ?? "-"}</b></div>
                        <div style={{ fontSize: 14 }}>% músculo: <b>{latestMeasurement.muscle_pct ?? "-"}</b></div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 14, color: BRAND.muted, fontSize: 13 }}>
                      Aún no hay mediciones registradas.
                    </div>
                  )}
                </Card>

                <Card title="Resumen físico" subtitle="Lectura rápida">
                  <div style={{ display: "grid", gap: 12 }}>
                    <DataField label="Cambio de peso" value={weightChange} />
                    <DataField label="Cambio de cintura" value={waistChange} />
                    <DataField label="Semana activa" value={selectedWeek || "-"} />
                    <DataField label="Lunes de la fecha elegida" value={activeWeekFromDate} />
                  </div>
                </Card>

                <Card title="Mis semanas" subtitle="Puedes revisar semanas anteriores">
                  <div style={{ display: "grid", gap: 10, maxHeight: 420, overflowY: "auto" }}>
                    {weeks.map((w) => {
                      const active = w.week_start === selectedWeek;
                      return (
                        <button
                          key={w.id}
                          onClick={() => onPickWeek(w.week_start)}
                          style={{
                            textAlign: "left",
                            borderRadius: 18,
                            padding: 14,
                            border: active
                              ? "1px solid rgba(31,59,83,0.20)"
                              : `1px solid ${BRAND.border}`,
                            background: active ? BRAND.accent : BRAND.surface,
                            cursor: "pointer",
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
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 900, color: BRAND.text, fontSize: 14 }}>
                                Semana {w.week_start}
                              </div>
                              <div style={{ marginTop: 6, color: BRAND.muted, fontSize: 12 }}>
                                Actualizado: {new Date(w.updated_at).toLocaleString()}
                              </div>
                            </div>

                            {active ? <SmallBadge>Actual</SmallBadge> : null}
                          </div>
                        </button>
                      );
                    })}

                    {weeks.length === 0 ? (
                      <div style={{ color: BRAND.muted, fontSize: 14 }}>
                        Aún no hay planes publicados.
                      </div>
                    ) : null}
                  </div>
                </Card>
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 18, minWidth: 0 }}>
              {showTodaySection ? (
                <>
                  <div ref={sectionTodayRef}>
                    <Card
                      title="Mi día"
                      subtitle="Esto es lo que te toca hoy"
                      action={
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <input
                            type="date"
                            value={adherenceDate}
                            onChange={(e) => setAdherenceDate(e.target.value)}
                            style={{ ...inputStyle, width: 170 }}
                          />
                          <SmallBadge>{activeDayName}</SmallBadge>
                        </div>
                      }
                    >
                      {isMobile ? (
                        <div style={{ display: "grid", gap: 16, marginBottom: 16 }}>
                          <div style={responsiveGrid(160)}>
                            <DataField label="Nombre" value={profile.full_name} />
                            <DataField label="Sexo" value={profile.sex} />
                            <DataField
                              label="Altura"
                              value={profile.height_cm ? `${profile.height_cm} cm` : "-"}
                            />
                            <DataField label="Cambio de peso" value={weightChange} />
                            <DataField label="Cambio de cintura" value={waistChange} />
                            <DataField label="Semana activa" value={selectedWeek || "-"} />
                          </div>

                          <div
                            style={{
                              background: BRAND.surfaceSoft,
                              border: `1px solid ${BRAND.border}`,
                              borderRadius: 16,
                              padding: 14,
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 12, color: BRAND.muted, fontWeight: 700 }}>
                                Estado adherencia
                              </div>
                              <div style={{ marginTop: 8 }}>
                                <SmallBadge tone={adherenceStatus.tone}>{adherenceStatus.label}</SmallBadge>
                              </div>
                            </div>

                            {latestMeasurement ? (
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 12, color: BRAND.muted, fontWeight: 700 }}>
                                  Última medición
                                </div>
                                <div style={{ marginTop: 4, fontWeight: 900, color: BRAND.text }}>
                                  {latestMeasurement.measured_at}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      <div
                        style={{
                          background: BRAND.surfaceSoft,
                          borderRadius: 18,
                          padding: 16,
                          border: `1px solid ${BRAND.border}`,
                        }}
                      >
                        {renderTodayPlan()}
                      </div>
                    </Card>
                  </div>
                </>
              ) : null}

              {showAdherenceSection ? (
                <div ref={sectionAdherenceRef}>
                  <Card
                    title="Mi adherencia"
                    subtitle="Marca lo que sí cumpliste en este día"
                    action={
                      <PrimaryButton onClick={saveAdherence} disabled={savingAdherence}>
                        {savingAdherence ? "Guardando..." : "Guardar"}
                      </PrimaryButton>
                    }
                  >
                    <div
                      style={{
                        background: "linear-gradient(135deg, #f8fbfd 0%, #eef5f9 100%)",
                        borderRadius: 20,
                        padding: 16,
                        border: `1px solid ${BRAND.border}`,
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: BRAND.text }}>
                            Progreso diario
                          </div>
                          <div style={{ marginTop: 4, color: BRAND.muted, fontSize: 13 }}>
                            {adherenceDone} de 9 tareas completadas
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 900,
                            color: BRAND.text,
                            letterSpacing: "-0.03em",
                          }}
                        >
                          {todayAdherencePercent}%
                        </div>
                      </div>

                      <div style={{ marginTop: 14 }}>
                        <ProgressBar percent={todayAdherencePercent} />
                      </div>
                    </div>

                    <div style={responsiveGrid(180)}>
                      <AdherenceToggle
                        active={adherenceLog.breakfast_ok}
                        label="Desayuno"
                        onClick={() => toggleAdherence("breakfast_ok")}
                      />
                      <AdherenceToggle
                        active={adherenceLog.snack1_ok}
                        label="Snack 1"
                        onClick={() => toggleAdherence("snack1_ok")}
                      />
                      <AdherenceToggle
                        active={adherenceLog.lunch_ok}
                        label="Almuerzo"
                        onClick={() => toggleAdherence("lunch_ok")}
                      />
                      <AdherenceToggle
                        active={adherenceLog.snack2_ok}
                        label="Snack 2"
                        onClick={() => toggleAdherence("snack2_ok")}
                      />
                      <AdherenceToggle
                        active={adherenceLog.dinner_ok}
                        label="Cena"
                        onClick={() => toggleAdherence("dinner_ok")}
                      />
                      <AdherenceToggle
                        active={adherenceLog.workout_ok}
                        label="Entrenamiento"
                        onClick={() => toggleAdherence("workout_ok")}
                      />
                      <AdherenceToggle
                        active={adherenceLog.water_ok}
                        label="Agua"
                        onClick={() => toggleAdherence("water_ok")}
                      />
                      <AdherenceToggle
                        active={adherenceLog.steps_ok}
                        label="Pasos"
                        onClick={() => toggleAdherence("steps_ok")}
                      />
                      <AdherenceToggle
                        active={adherenceLog.sleep_ok}
                        label="Sueño"
                        onClick={() => toggleAdherence("sleep_ok")}
                      />
                    </div>

                    <textarea
                      rows={3}
                      placeholder="Notas del día"
                      value={adherenceLog.notes}
                      onChange={(e) =>
                        setAdherenceLog((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      style={{ ...textareaStyle, marginTop: 14 }}
                    />
                  </Card>
                </div>
              ) : null}

              {showWeekSection ? (
                <div ref={sectionWeekRef} style={{ display: "grid", gap: 18 }}>
                  {isMobile ? (
                    <Card title="Mis semanas" subtitle="Revisa semanas anteriores">
                      <div style={{ display: "grid", gap: 10, maxHeight: 420, overflowY: "auto" }}>
                        {weeks.map((w) => {
                          const active = w.week_start === selectedWeek;
                          return (
                            <button
                              key={w.id}
                              onClick={() => onPickWeek(w.week_start)}
                              style={{
                                textAlign: "left",
                                borderRadius: 18,
                                padding: 14,
                                border: active
                                  ? "1px solid rgba(31,59,83,0.20)"
                                  : `1px solid ${BRAND.border}`,
                                background: active ? BRAND.accent : BRAND.surface,
                                cursor: "pointer",
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
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 900, color: BRAND.text, fontSize: 14 }}>
                                    Semana {w.week_start}
                                  </div>
                                  <div style={{ marginTop: 6, color: BRAND.muted, fontSize: 12 }}>
                                    Actualizado: {new Date(w.updated_at).toLocaleString()}
                                  </div>
                                </div>

                                {active ? <SmallBadge>Actual</SmallBadge> : null}
                              </div>
                            </button>
                          );
                        })}

                        {weeks.length === 0 ? (
                          <div style={{ color: BRAND.muted, fontSize: 14 }}>
                            Aún no hay planes publicados.
                          </div>
                        ) : null}
                      </div>
                    </Card>
                  ) : null}

                  <Card title="Resumen semanal" subtitle="Puedes revisar todos los días de la semana seleccionada">
                    {renderWeekOverview()}
                  </Card>
                </div>
              ) : null}

              {showProgressSection ? (
                <div ref={sectionProgressRef} style={{ display: "grid", gap: 18 }}>
                  <Card title="Interpretación de progreso" subtitle="Resumen automático de tus cambios">
                    <div style={{ display: "grid", gap: 10 }}>
                      {measurementInsights.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: 12,
                            background: BRAND.surfaceSoft,
                            borderRadius: 14,
                            border: `1px solid ${BRAND.border}`,
                            color: "#334155",
                            fontSize: 14,
                            fontWeight: 700,
                            wordBreak: "break-word",
                          }}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card title="Gráficos de progreso" subtitle="Evolución de peso, composición y perímetros">
                    <div
                      style={{
                        background: BRAND.surfaceSoft,
                        borderRadius: 18,
                        padding: 16,
                        border: `1px solid ${BRAND.border}`,
                        overflowX: "auto",
                      }}
                    >
                      <ProgressCharts data={progressDataAsc} />
                    </div>
                  </Card>

                  <Card title="Tabla de progreso" subtitle="Historial completo de mediciones" noPadding>
                    <div
                      style={{
                        overflowX: "auto",
                        borderTop: `1px solid ${BRAND.border}`,
                        background: "#fff",
                      }}
                    >
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 980 }}>
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            {["Fecha", "Peso", "IMC", "Cintura", "Cadera", "Pecho", "Brazo", "Muslo", "Pant.", "%Grasa", "%Músculo"].map((h) => (
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
                            </tr>
                          ))}

                          {progressRows.length === 0 ? (
                            <tr>
                              <td colSpan={11} style={{ padding: 18, color: BRAND.muted }}>
                                Aún no hay mediciones registradas.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {profile && isMobile ? (
        <MobileBottomNav
          activeSection={mobileSection}
          onToday={() => setMobileSection("today")}
          onAdherence={() => setMobileSection("adherence")}
          onWeek={() => setMobileSection("week")}
          onProgress={() => setMobileSection("progress")}
        />
      ) : null}

      <style>{`
        @media (max-width: 1024px) {
          .patient-sidebar {
            position: static !important;
            top: auto !important;
          }
        }

        @media (max-width: 1100px) {
          .patient-main-layout {
            grid-template-columns: 1fr !important;
          }
        }

        .mobile-bottom-nav {
          position: fixed;
          left: 12px;
          right: 12px;
          bottom: 12px;
          z-index: 50;
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 6px 4px;
          border-radius: 20px;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 16px 40px rgba(15,23,42,0.14);
        }

        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: flex;
          }

          .patient-top-chips {
            display: none !important;
          }
        }
      `}</style>
    </PageShell>
  );
}