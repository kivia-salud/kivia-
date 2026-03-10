import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const BRAND = {
  bg: "#eef3f7",
  bgDark: "#dbe6ee",
  surface: "#ffffff",
  surfaceSoft: "#f8fafc",
  dark: "#1f3b53",
  darkSoft: "#2f4b63",
  border: "rgba(15, 23, 42, 0.12)",
  muted: "rgba(15, 23, 42, 0.66)",
  text: "#0f172a",
  accent: "#dce9f2",
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

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "12px 14px",
        borderRadius: 14,
        cursor: "pointer",
        border: active ? "1px solid rgba(31,59,83,0.18)" : `1px solid ${BRAND.border}`,
        background: active ? BRAND.accent : BRAND.surface,
        color: BRAND.text,
        fontWeight: 900,
        transition: "0.18s ease",
      }}
    >
      {children}
    </button>
  );
}

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
          background: BRAND.surfaceSoft,
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

export default function Login() {
  const nav = useNavigate();

  const [mode, setMode] = useState("signin"); // signin | signup | reset

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState("neutral");
  const [loading, setLoading] = useState(false);

  const canSignIn = useMemo(() => {
    return email.trim() && pass.trim();
  }, [email, pass]);

  const canSignUp = useMemo(() => {
    return email.trim() && pass.trim() && confirmPass.trim();
  }, [email, pass, confirmPass]);

  const showMessage = (text, tone = "neutral") => {
    setMsg(text);
    setMsgTone(tone);
  };

  const clearMessage = () => {
    setMsg("");
    setMsgTone("neutral");
  };

  const validateEmail = (value) => {
    return /\S+@\S+\.\S+/.test(value);
  };

  const handleSignUp = async () => {
    clearMessage();

    if (!email || !pass || !confirmPass) {
      return showMessage("Completa correo, contraseña y confirmación.", "warning");
    }

    if (!validateEmail(email.trim())) {
      return showMessage("Ingresa un correo válido.", "warning");
    }

    if (pass.length < 6) {
      return showMessage("La contraseña debe tener al menos 6 caracteres.", "warning");
    }

    if (pass !== confirmPass) {
      return showMessage("Las contraseñas no coinciden.", "warning");
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
    });

    setLoading(false);

    if (error) {
      return showMessage(error.message, "danger");
    }

    showMessage(
      "Cuenta creada. Revisa tu correo si se requiere confirmación. Luego inicia sesión y, si eres paciente nuevo, vincula tu cuenta con el código de tu médico.",
      "success"
    );

    setMode("signin");
    setPass("");
    setConfirmPass("");
  };

  const handleSignIn = async () => {
    clearMessage();

    if (!email || !pass) {
      return showMessage("Ingresa correo y contraseña.", "warning");
    }

    if (!validateEmail(email.trim())) {
      return showMessage("Ingresa un correo válido.", "warning");
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error) {
      setLoading(false);
      return showMessage("No se pudo iniciar sesión. Revisa tu correo o contraseña.", "danger");
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    const { data: doctorRow } = await supabase
      .from("doctors")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    setLoading(false);

    if (doctorRow?.user_id) {
      nav("/doctor", { replace: true });
    } else {
      nav("/patient", { replace: true });
    }
  };

  const handleResetPassword = async () => {
    clearMessage();

    if (!email.trim()) {
      return showMessage("Ingresa tu correo para enviarte el enlace de recuperación.", "warning");
    }

    if (!validateEmail(email.trim())) {
      return showMessage("Ingresa un correo válido.", "warning");
    }

    setLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      return showMessage(error.message, "danger");
    }

    showMessage(
      "Te enviamos un enlace de recuperación. Revisa tu correo y sigue las instrucciones.",
      "success"
    );
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
          width: "min(100%, 980px)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
          gap: 18,
        }}
        className="login-layout"
      >
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND.dark} 0%, ${BRAND.darkSoft} 100%)`,
            borderRadius: 28,
            padding: "clamp(22px, 4vw, 34px)",
            color: "white",
            boxShadow: "0 18px 40px rgba(31,59,83,0.22)",
            display: "grid",
            alignContent: "space-between",
            minHeight: 520,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "clamp(28px, 5vw, 36px)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
              }}
            >
              KiviA
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: "clamp(18px, 3vw, 22px)",
                fontWeight: 800,
                lineHeight: 1.2,
                maxWidth: 420,
              }}
            >
              Salud, seguimiento y adherencia en una experiencia clara.
            </div>

            <div
              style={{
                marginTop: 14,
                fontSize: 14,
                opacity: 0.9,
                maxWidth: 500,
                lineHeight: 1.55,
              }}
            >
              Si eres paciente nuevo, primero crea tu cuenta. Después entra a KiviA
              y vincúlala con el código que te entregó tu médico.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 15 }}>Si ya tienes cuenta</div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                Inicia sesión con tu correo y contraseña.
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 15 }}>Si eres paciente nuevo</div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                Crea tu cuenta primero. La vinculación con tu médico se hace después,
                dentro de la app del paciente.
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 15 }}>¿Olvidaste tu contraseña?</div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                Usa la opción de recuperación y te enviaremos un enlace a tu correo.
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: BRAND.surface,
            borderRadius: 28,
            border: `1px solid ${BRAND.border}`,
            boxShadow: "0 14px 36px rgba(15,23,42,0.06)",
            padding: "clamp(20px, 4vw, 30px)",
            alignSelf: "center",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 24, color: BRAND.text }}>
            Acceso
          </div>
          <div style={{ marginTop: 6, color: BRAND.muted, fontSize: 14 }}>
            Elige la acción correcta para evitar errores de acceso.
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 18,
              flexWrap: "wrap",
            }}
          >
            <TabButton active={mode === "signin"} onClick={() => setMode("signin")}>
              Entrar
            </TabButton>
            <TabButton active={mode === "signup"} onClick={() => setMode("signup")}>
              Crear cuenta
            </TabButton>
            <TabButton active={mode === "reset"} onClick={() => setMode("reset")}>
              Recuperar
            </TabButton>
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />

            {mode !== "reset" ? (
              <input
                type="password"
                placeholder="Contraseña"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                style={inputStyle}
              />
            ) : null}

            {mode === "signup" ? (
              <input
                type="password"
                placeholder="Confirmar contraseña"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                style={inputStyle}
              />
            ) : null}
          </div>

          {mode === "signin" ? (
            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <PrimaryButton onClick={handleSignIn} disabled={loading || !canSignIn}>
                {loading ? "Entrando..." : "Entrar"}
              </PrimaryButton>

              <button
                onClick={() => {
                  clearMessage();
                  setMode("reset");
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: BRAND.dark,
                  fontWeight: 900,
                  cursor: "pointer",
                  padding: 0,
                  textAlign: "left",
                }}
              >
                Olvidé mi contraseña
              </button>
            </div>
          ) : null}

          {mode === "signup" ? (
            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <PrimaryButton onClick={handleSignUp} disabled={loading || !canSignUp}>
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </PrimaryButton>

              <SecondaryButton
                onClick={() => {
                  clearMessage();
                  setMode("signin");
                }}
              >
                Ya tengo cuenta
              </SecondaryButton>
            </div>
          ) : null}

          {mode === "reset" ? (
            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <PrimaryButton onClick={handleResetPassword} disabled={loading || !email.trim()}>
                {loading ? "Enviando..." : "Enviar enlace de recuperación"}
              </PrimaryButton>

              <SecondaryButton
                onClick={() => {
                  clearMessage();
                  setMode("signin");
                }}
              >
                Volver a entrar
              </SecondaryButton>
            </div>
          ) : null}

          {mode === "signup" ? (
            <InfoBox tone="neutral">
              Si eres paciente, crear cuenta no te vincula automáticamente con tu médico.
              Ese paso se hace después dentro de KiviA Paciente usando el código que te entregaron.
            </InfoBox>
          ) : null}

          {mode === "reset" ? (
            <InfoBox tone="neutral">
              Usa el mismo correo con el que creaste tu cuenta. Si no recuerdas ese correo,
              el problema no es la contraseña: es que estás intentando entrar con otra cuenta.
            </InfoBox>
          ) : null}

          {msg ? <InfoBox tone={msgTone}>{msg}</InfoBox> : null}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .login-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}