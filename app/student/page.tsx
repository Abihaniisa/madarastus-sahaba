import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getStudent,
  getAttendanceByStudent,
  getAchievementsByStudent,
  calculateStats,
  getWeeklyBreakdown,
  getApplicableRecords,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function StudentProfilePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const id = params.id;

  if (!id) {
    notFound();
  }

  const [student, attendance, achievements] = await Promise.all([
    getStudent(id),
    getAttendanceByStudent(id),
    getAchievementsByStudent(id),
  ]);

  if (!student) {
    notFound();
  }

  const applicableRecords = getApplicableRecords(attendance, student.joining_date);
  const stats = calculateStats(applicableRecords);
  const weeklyBreakdown = getWeeklyBreakdown(applicableRecords, student.joining_week);

  return (
    <div className="container" style={{ padding: '1rem 0 2rem' }}>
      <Link href="/" style={{ fontSize: '0.9rem', display: 'inline-block', marginBottom: '1rem' }}>
        ← Back to Directory
      </Link>

      {/* Report Card */}
      <div
        className="card"
        style={{
          border: '3px double var(--color-accent)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          position: 'relative',
          maxWidth: '500px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '0.5rem',
            left: '0.5rem',
            right: '0.5rem',
            bottom: '0.5rem',
            border: '1px solid var(--color-accent-light)',
            borderRadius: 'var(--radius-md)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Photo / Avatar - Expandable (WhatsApp-style) */}
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'var(--color-primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#fff',
              margin: '0 auto 0.75rem',
              overflow: 'hidden',
              cursor: 'pointer',
              border: '3px solid var(--color-accent)',
              transition: 'transform var(--transition-fast)',
            }}
            onClick={(e) => {
              const target = e.currentTarget;
              const overlay = document.createElement('div');
              overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.85);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                animation: fadeIn 0.2s ease;
              `;

              const img = target.querySelector('img');
              const letter = target.textContent?.trim() || '';

              let content: HTMLElement;
              if (img) {
                const imgElement = document.createElement('img') as HTMLImageElement;
                imgElement.src = img.src;
                imgElement.alt = img.alt;
                imgElement.style.cssText = `
                  max-width: 90vw;
                  max-height: 80vh;
                  object-fit: contain;
                  border-radius: var(--radius-md);
                  box-shadow: var(--shadow-lg);
                `;
                content = imgElement;
              } else {
                content = document.createElement('div');
                content.style.cssText = `
                  width: 200px;
                  height: 200px;
                  border-radius: 50%;
                  background: var(--color-primary-light);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 4rem;
                  font-weight: bold;
                  color: #fff;
                `;
                content.textContent = letter;
              }

              const nameDiv = document.createElement('div');
              nameDiv.textContent = student.full_name;
              nameDiv.style.cssText = `
                position: absolute;
                bottom: 10%;
                left: 50%;
                transform: translateX(-50%);
                color: #fff;
                font-size: 1.2rem;
                font-weight: 600;
                text-align: center;
                font-family: var(--font-family-body);
              `;

              overlay.appendChild(content);
              overlay.appendChild(nameDiv);

              let isFullScreen = false;
              content.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!isFullScreen) {
                  if (img) {
                    content.style.maxWidth = '100vw';
                    content.style.maxHeight = '100vh';
                    content.style.borderRadius = '0';
                  }
                  isFullScreen = true;
                } else {
                  if (img) {
                    content.style.maxWidth = '90vw';
                    content.style.maxHeight = '80vh';
                    content.style.borderRadius = 'var(--radius-md)';
                  }
                  isFullScreen = false;
                }
              });

              overlay.addEventListener('click', () => {
                document.body.removeChild(overlay);
              });

              const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                  document.body.removeChild(overlay);
                  document.removeEventListener('keydown', handleEsc);
                }
              };
              document.addEventListener('keydown', handleEsc);

              document.body.appendChild(overlay);

              const style = document.createElement('style');
              style.textContent = `
                @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
              `;
              document.head.appendChild(style);
              setTimeout(() => document.head.removeChild(style), 300);
            }}
          >
            {student.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={student.photo_url}
                alt={student.full_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              student.full_name.charAt(0).toUpperCase()
            )}
          </div>

          <h2 style={{ textAlign: 'center', fontSize: '1.25rem', wordWrap: 'break-word' }}>
            {student.full_name}
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Registration Number: {student.id}
          </p>

          <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
            <p style={{ fontSize: '0.9rem' }}>
              <strong>Enrolled in Program:</strong> Week {student.joining_week}
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Enrolled on: {student.joining_date}
            </p>
          </div>

          {/* Stats */}
          <div
            style={{
              background: 'var(--color-bg)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              margin: '0.75rem 0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  {stats.recitationRate.toFixed(0)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Recitation Rate
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-accent-dark)' }}>
                  {stats.completionRate.toFixed(0)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Completion Rate
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1rem',
                marginTop: '0.5rem',
                fontSize: '0.85rem',
              }}
            >
              <span>
                <span className="badge badge-r">R</span> {stats.recited}
              </span>
              <span>
                <span className="badge badge-m">M</span> {stats.makeup}
              </span>
              <span>
                <span className="badge badge-x">X</span> {stats.pending}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', textAlign: 'center', fontStyle: 'italic' }}>
            * Calculated from enrollment date. Sessions before enrollment are not counted.
          </p>

          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Pin feature available on home page
            </span>
          </div>
        </div>
      </div>

      {/* Weekly Breakdown */}
      <section style={{ marginTop: '1.5rem', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Weekly Breakdown</h3>
        {weeklyBreakdown.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No weeks recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {weeklyBreakdown.map((week) => (
              <div
                key={week.week}
                className="card"
                style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span style={{ fontWeight: '600', fontSize: '0.8rem', minWidth: '55px' }}>
                  Week {week.week}
                </span>
                <div style={{ display: 'flex', gap: '0.25rem', flex: 1 }}>
                  {week.days.map((day, idx) => (
                    <span
                      key={idx}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: day.status
                          ? STATUS_COLORS[day.status]
                          : 'var(--color-bg)',
                        border: day.status ? 'none' : '1px solid var(--color-border)',
                        display: 'inline-block',
                      }}
                      title={`${day.date}: ${day.status ? STATUS_LABELS[day.status] : 'No session'}`}
                    />
                  ))}
                </div>
                <span style={{ fontSize: '0.8rem', minWidth: '45px', textAlign: 'right' }}>
                  {week.rate.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* All Sessions */}
      <section style={{ marginTop: '1.5rem', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>All Sessions</h3>
        {applicableRecords.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No sessions recorded.</p>
        ) : (
          <div
            className="card"
            style={{
              padding: '0.5rem',
              maxHeight: '200px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.15rem',
            }}
          >
            {applicableRecords.map((record) => (
              <div
                key={record.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.85rem',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <span>{record.date}</span>
                <span className={`badge badge-${record.status.toLowerCase()}`}>
                  {STATUS_LABELS[record.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Achievements */}
      <section style={{ marginTop: '1.5rem', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Achievements</h3>
        {achievements.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No achievements recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {achievements.map((achievement) => (
              <div key={achievement.id} className="card" style={{ padding: '0.5rem 0.75rem' }}>
                <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{achievement.title}</p>
                {achievement.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {achievement.description}
                  </p>
                )}
                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-light)' }}>
                  {achievement.category || 'Achievement'} · {achievement.date || ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}