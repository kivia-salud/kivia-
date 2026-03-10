import { useState } from 'react'
import { supabase } from '../supabaseClient'

const initialState = {
  measured_at: new Date().toISOString().slice(0, 10),
  weight_kg: '',
  height_cm: '',
  waist_cm: '',
  hip_cm: '',
  body_fat_pct: '',
  muscle_pct: '',
  notes: ''
}

export default function MeasurementForm({ patientId, userId, onSaved }) {
  const [form, setForm] = useState(initialState)
  const [loading, setLoading] = useState(false)

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    const payload = {
      patient_id: patientId,
      measured_at: form.measured_at,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      waist_cm: form.waist_cm ? Number(form.waist_cm) : null,
      hip_cm: form.hip_cm ? Number(form.hip_cm) : null,
      body_fat_pct: form.body_fat_pct ? Number(form.body_fat_pct) : null,
      muscle_pct: form.muscle_pct ? Number(form.muscle_pct) : null,
      notes: form.notes || null,
      created_by: userId
    }

    const { error } = await supabase.from('patient_measurements').insert(payload)

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setForm(initialState)
    if (onSaved) onSaved()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
        <input type="date" value={form.measured_at} onChange={(e) => updateField('measured_at', e.target.value)} />
        <input placeholder="Peso kg" value={form.weight_kg} onChange={(e) => updateField('weight_kg', e.target.value)} />
        <input placeholder="Talla cm" value={form.height_cm} onChange={(e) => updateField('height_cm', e.target.value)} />
        <input placeholder="Cintura cm" value={form.waist_cm} onChange={(e) => updateField('waist_cm', e.target.value)} />
        <input placeholder="Cadera cm" value={form.hip_cm} onChange={(e) => updateField('hip_cm', e.target.value)} />
        <input placeholder="% grasa" value={form.body_fat_pct} onChange={(e) => updateField('body_fat_pct', e.target.value)} />
        <input placeholder="% músculo" value={form.muscle_pct} onChange={(e) => updateField('muscle_pct', e.target.value)} />
      </div>

      <textarea
        placeholder="Notas"
        value={form.notes}
        onChange={(e) => updateField('notes', e.target.value)}
        style={{ width: '100%', marginTop: '10px' }}
      />

      <button type="submit" disabled={loading} style={{ marginTop: '12px' }}>
        {loading ? 'Guardando...' : 'Guardar medición'}
      </button>
    </form>
  )
}