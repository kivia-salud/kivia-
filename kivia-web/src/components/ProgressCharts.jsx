import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function ProgressCharts({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ color: "#64748b" }}>No hay datos para graficar.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="measured_at" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="weight_kg" name="Peso (kg)" stroke="#1d4ed8" />
            <Line type="monotone" dataKey="bmi" name="IMC" stroke="#0f172a" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="measured_at" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="waist_cm" name="Cintura" stroke="#dc2626" />
            <Line type="monotone" dataKey="hip_cm" name="Cadera" stroke="#7c3aed" />
            <Line type="monotone" dataKey="chest_cm" name="Pecho" stroke="#ea580c" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="measured_at" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="bodyfat_pct" name="% grasa" stroke="#16a34a" />
            <Line type="monotone" dataKey="muscle_pct" name="% músculo" stroke="#f59e0b" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}