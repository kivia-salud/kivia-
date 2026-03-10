export default function Card({ title, right, children }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '16px',
      padding: '16px',
      marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
    }}>
      {(title || right) && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          {title ? <h3 style={{ margin: 0 }}>{title}</h3> : <div />}
          {right}
        </div>
      )}
      {children}
    </div>
  )
}