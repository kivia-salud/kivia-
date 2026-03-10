import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AdherenceForm({ patientId }) {
  const [form, setForm] = useState({
    log_date: new Date().toISOString().slice(0, 10),
    water_ok: false,
    breakfast_ok: false,
    lunch_ok: false,
    dinner_ok: false,
    workout_ok: false,
    notes: ''
  })

  async function save() {
    const { error } = await supabase.from('daily_adherence_logs').upsert({
      patient_id: patientId,
      ...form
    }, { onConflict: 'patient_id,log_date' })

    if (error) {
      alert(error.message)
      return
    }

    alert('Adherencia guardada')
  }

  function toggle(key) {
    setForm((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div>
      <input
        type="date"
        value={form.log_date}
        onChange={(e) => setForm((prev) => ({ ...prev, log_date: e.target.value }))}
      />

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
        <button onClick={() => toggle('water_ok')}>Agua</button>
        <button onClick={() => toggle('breakfast_ok')}>Desayuno</button>
        <button onClick={() => toggle('lunch_ok')}>Almuerzo</button>
        <button onClick={() => toggle('dinner_ok')}>Cena</button>
        <button onClick={() => toggle('workout_ok')}>Entrenamiento</button>
      </div>

      <textarea
        placeholder="Notas"
        value={form.notes}
        onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
        style={{ width: '100%', marginTop: '10px' }}
      />

      <button onClick={save} style={{ marginTop: '10px' }}>
        Guardar adherencia
      </button>
    </div>
  )
}