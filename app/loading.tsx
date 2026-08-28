export default function Loading() {
  return (
    <main style={{ minHeight: '100vh', background: '#fdf9f5', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '40px', width: '50%', marginBottom: '20px' }} />
        <div className="skeleton" style={{ height: '16px', width: '80%', marginBottom: '8px' }} />
        <div className="skeleton" style={{ height: '16px', width: '60%', marginBottom: '20px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', borderRadius: '12px', padding: '12px' }}>
              <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: '16px', width: '70%', marginBottom: '6px' }} />
                <div className="skeleton" style={{ height: '12px', width: '40%' }} />
              </div>
              <div className="skeleton" style={{ width: '40px', height: '16px' }} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}