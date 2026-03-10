export default function DayEditor({ day, data, onChange }) {
  return (
    <div className="border rounded p-4 mb-4">
      <h3 className="font-bold mb-2">{day}</h3>

      <input
        placeholder="Breakfast"
        value={data?.breakfast || ""}
        onChange={(e) => onChange(day, "breakfast", e.target.value)}
      />

      <input
        placeholder="Snack"
        value={data?.snack1 || ""}
        onChange={(e) => onChange(day, "snack1", e.target.value)}
      />

      <input
        placeholder="Lunch"
        value={data?.lunch || ""}
        onChange={(e) => onChange(day, "lunch", e.target.value)}
      />

      <input
        placeholder="Snack"
        value={data?.snack2 || ""}
        onChange={(e) => onChange(day, "snack2", e.target.value)}
      />

      <input
        placeholder="Dinner"
        value={data?.dinner || ""}
        onChange={(e) => onChange(day, "dinner", e.target.value)}
      />

      <input
        placeholder="Training"
        value={data?.training || ""}
        onChange={(e) => onChange(day, "training", e.target.value)}
      />

      <input
        placeholder="Notes"
        value={data?.notes || ""}
        onChange={(e) => onChange(day, "notes", e.target.value)}
      />
    </div>
  )
}