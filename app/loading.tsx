export default function Loading() {
  return (
    <main style={{ minHeight: '100vh', background: '#fdf9f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '400px', padding: '20px' }}>
        <div style={{ height: '16px', background: '#f0e4d8', borderRadius: '8px', width: '60%', animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: '16px', background: '#f0e4d8', borderRadius: '8px', width: '80%', animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: '16px', background: '#f0e4d8', borderRadius: '8px', width: '40%', animation: 'pulse 1.5s infinite' }} />
        <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
      </div>
    </main>
  );
}