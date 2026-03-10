export function buildMeasurementInsights(measurements = []) {
  if (!measurements || measurements.length < 2) {
    return ["Aún no hay suficientes mediciones para analizar progreso."];
  }

  const sorted = [...measurements].sort(
    (a, b) => new Date(a.measured_at) - new Date(b.measured_at)
  );

  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];

  const insights = [];

  if (latest.weight_kg != null && prev.weight_kg != null) {
    const diff = Number(latest.weight_kg) - Number(prev.weight_kg);
    if (diff < 0) insights.push(`El peso bajó ${Math.abs(diff).toFixed(1)} kg.`);
    else if (diff > 0) insights.push(`El peso subió ${diff.toFixed(1)} kg.`);
    else insights.push("El peso se mantiene estable.");
  }

  if (latest.waist_cm != null && prev.waist_cm != null) {
    const diff = Number(latest.waist_cm) - Number(prev.waist_cm);
    if (diff < 0) insights.push(`La cintura disminuyó ${Math.abs(diff).toFixed(1)} cm.`);
    else if (diff > 0) insights.push(`La cintura aumentó ${diff.toFixed(1)} cm.`);
  }

  if (latest.bodyfat_pct != null && prev.bodyfat_pct != null) {
    const diff = Number(latest.bodyfat_pct) - Number(prev.bodyfat_pct);
    if (diff < 0) insights.push(`El porcentaje de grasa bajó ${Math.abs(diff).toFixed(1)} puntos.`);
    else if (diff > 0) insights.push(`El porcentaje de grasa subió ${diff.toFixed(1)} puntos.`);
  }

  if (latest.muscle_pct != null && prev.muscle_pct != null) {
    const diff = Number(latest.muscle_pct) - Number(prev.muscle_pct);
    if (diff > 0) insights.push(`El porcentaje de músculo subió ${diff.toFixed(1)} puntos.`);
    else if (diff < 0) insights.push(`El porcentaje de músculo bajó ${Math.abs(diff).toFixed(1)} puntos.`);
  }

  return insights.length ? insights : ["Sin cambios claros todavía."];
}