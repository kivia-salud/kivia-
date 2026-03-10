import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const BRAND = {
  bg: "#eef3f7",
  surface: "#ffffff",
  dark: "#1f3b53",
  darkSoft: "#2f4b63",
  border: "rgba(15, 23, 42, 0.12)",
  muted: "rgba(15, 23, 42, 0.66)",
  text: "#0f172a",
  successBg: "#f0fff4",
  successBorder: "#2f855a",
  successText: "#22543d",
  dangerBg: "#fff5f5",
  dangerBorder: "#dc2626",
  dangerText: "#8a0b0b",
  warningBg: "#fffbeb",
  warningBorder: "#d97706",
  warningText: "#92400e",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: 14,
  borderRadius: 14,
  border: `1px solid ${BRAND.border}`,
  background: "#fff",
  color: BRAND.text,
  outline: "none",
  minWidth: 0,
  fontSize: 14,
};

function PrimaryButton({ children, onClick, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: 14,
        borderRadius: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        border: "none",
        background: disabled ? "#94a3b8" : BRAND.dark,
        color: "white",
        fontWeight: 900,
        fontSize: 14,
        boxShadow: disabled ? "none" : "0 10px 24px rgba(31,59,83,0.18)",
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
        width: "100%",
        padding: 14,
        borderRadius: 14,
        cursor: "pointer",
        border: `1px solid ${BRAND.border}`,
        background: "white",
        color: BRAND.text,
        fontWeight: 900,
        fontSize: 14,
      }}
    >
      {children}
    </button>
  );
}

function InfoBox({ tone = "neutral", children }) {
  const styles =
    tone === "success"
      ? {
          background: BRAND.successBg,
          border: `1px solid ${BRAND.successBorder}`,
          color: BRAND.successText,
        }
      : tone === "danger"
      ? {
          background: BRAND.dangerBg,
          border: `1px solid ${BRAND.dangerBorder}`,
          color: BRAND.dangerText,
        }
      : tone === "warning"
      ? {
          background: BRAND.warningBg,
          border: `1px solid ${BRAND.warningBorder}`,
          color: BRAND.warningText,
        }
      : {
          background: "#f8fafc",
          border: `1px solid ${BRAND.border}`,
          color: BRAND.text,
        };

  return (
    <div
      style={{
        marginTop: 14,
        padding: 12,
        borderRadius: 14,
        fontWeight: 700,
        fontSize: 14,
        ...styles,
      }}
    >
      {children}
    </div>
  );
}

export default function ResetPassword() {
  const nav = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState("neutral");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const showMessage = (text, tone = "neutral") => {
    setMsg(text);
    setMsgTone(tone);
  };

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      if (data?.session) {
        setReady(true);
        return;
      }

      showMessage(
        "El enlace no es válido o ya expiró. Solicita una nueva recuperación de contraseña.",
        "warning"
      );
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async () => {
    setMsg("");

    if (!password || !confirmPassword) {
      return showMessage("Completa ambos campos.", "warning");
    }

    if (password.length < 6) {
      return showMessage("La nueva contraseña debe tener al menos 6 caracteres.", "warning");
    }

    if (password !== confirmPassword) {
      return showMessage("Las contraseñas no coinciden.", "warning");
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      return showMessage(error.message, "danger");
    }

    showMessage("✅ Contraseña actualizada. Ahora puedes iniciar sesión.", "success");

    setTimeout(() => {
      nav("/login", { replace: true });
    }, 1200);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #d9e5ed 0%, #eef3f7 220px, #f6f9fb 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "min(100%, 520px)",
          background: BRAND.surface,
          borderRadius: 28,
          border: `1px solid ${BRAND.border}`,
          boxShadow: "0 14px 36px rgba(15,23,42,0.06)",
          padding: "clamp(20px, 4vw, 30px)",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 28, color: BRAND.text }}>
          Nueva contraseña
        </div>
        <div style={{ marginTop: 8, color: BRAND.muted, fontSize: 14, lineHeight: 1.55 }}>
          Usa una contraseña que sí vayas a recordar. Si la olvidas otra vez, el problema no es
          Supabase: es que tu flujo de acceso sigue siendo débil.
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            disabled={!ready}
          />

          <input
            type="password"
            placeholder="Confirmar nueva contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={inputStyle}
            disabled={!ready}
          />
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          <PrimaryButton
            onClick={handleUpdatePassword}
            disabled={loading || !ready}
          >
            {loading ? "Actualizando..." : "Actualizar contraseña"}
          </PrimaryButton>

          <SecondaryButton onClick={() => nav("/login", { replace: true })}>
            Volver al login
          </SecondaryButton>
        </div>

        {!ready ? (
          <InfoBox tone="warning">
            Para cambiar la contraseña debes abrir esta pantalla desde el enlace enviado a tu correo.
          </InfoBox>
        ) : null}

        {msg ? <InfoBox tone={msgTone}>{msg}</InfoBox> : null}
      </div>
    </div>
  );
}