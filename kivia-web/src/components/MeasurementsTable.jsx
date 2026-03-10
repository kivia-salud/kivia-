import { supabase } from '../supabaseClient'

export default function MeasurementsTable({ rows, onDeleted }) {
  async function handleDelete(id) {
    const ok = window.confirm('¿Eliminar esta medición?')
    if (!ok) return

    const { error } = await supabase.from('patient_measurements').delete().eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    if (onDeleted) onDeleted()
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Peso</th>
            <th>Talla</th>
            <th>Cintura</th>
            <th>Cadera</th>
            <th>% Grasa</th>
            <th>% Músculo</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.measured_at}</td>
              <td>{r.weight_kg ?? '-'}</td>
              <td>{r.height_cm ?? '-'}</td>
              <td>{r.waist_cm ?? '-'}</td>
              <td>{r.hip_cm ?? '-'}</td>
              <td>{r.body_fat_pct ?? '-'}</td>
              <td>{r.muscle_pct ?? '-'}</td>
              <td>
                <button onClick={() => handleDelete(r.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan="8">No hay mediciones todavía.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}