import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function WeeklyPlanForm({ patientId, userId, onSaved }) {
  const [title, setTitle] = useState('Plan semanal')
  const [weekStart, setWeekStart] = useState('')
  const [weekEnd, setWeekEnd] = useState('')
  const [calories, setCalories] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()

    const { error } = await supabase.from('weekly_plans').insert({
      patient_id: patientId,
      title,
      week_start: weekStart,
      week_end: weekEnd,
      calories_target: calories ? Number(calories) : null,
      notes,
      created_by: userId
    })

    if (error) {
      alert(error.message)
      return
    }

    alert('Plan guardado')
    if (onSaved) onSaved()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gap: '10px' }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
        <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
        <input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} />
        <input value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="Kcal objetivo" />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas generales" />
      </div>

      <button type="submit" style={{ marginTop: '10px' }}>
        Guardar plan semanal
      </button>
    </form>
  )
}