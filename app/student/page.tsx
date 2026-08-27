import Link from 'next/link';
import {
  supabase,
  SCHOOL,
  STATUS_LABELS,
  calculateStats,
  getWeekly,
  getApplicable,
} from '@/lib';
import type { Student, AttendanceRecord, Achievement } from '@/lib';

export const dynamic = 'force-dynamic';

export default async function StudentPage({
  searchParams,
}: {
  searchParams: Promise<{ id: string }>;
}) {
  const { id } = await searchParams;

  if (!id) {
    return (
      <main className="container" style={{ padding: '40px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Student not found</h1>
        <Link
          href="/"
          style={{
            color: '#1a472a',
            textDecoration: 'underline',
            marginTop: '16px',
            display: 'inline-block',
          }}
        >
          Back to home
        </Link>
      </main>
    );
  }

  const { data: studentData } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (!studentData) {
    return (
      <main className="container" style={{ padding: '40px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Student not found</h1>
        <Link
          href="/"
          style={{
            color: '#1a472a',
            textDecoration: 'underline',
            marginTop: '16px',
            display: 'inline-block',
          }}
        >
          Back to home
        </Link>
      </main>
    );
  }

  const student: Student = studentData;

  const { data: attendanceData } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('student_id', id)
    .order('date');

  const records: AttendanceRecord[] = attendanceData || [];

  const { data: achievementsData } = await supabase
    .from('achievements')
    .select('*')
    .eq('student_id', id)
    .order('date', { ascending: false });

  const achievements: Achievement[] = achievementsData || [];

  const stats = calculateStats(records, student);
  const weekly = getWeekly(records, student);
  const applicable = getApplicable(records, student);
  const firstLetter = student.full_name.charAt(0).toUpperCase();

  return (
    <main className="container" style={{ padding: '16px 16px 32px' }}>
      <Link href="/" style={{ color: '#1a472a', fontSize: '14px' }}>
        ← Back to Students
      </Link>

      <div
        style={{
          marginTop: '16px',
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: '#1a472a',
            color: 'white',
            padding: '12px',
            textAlign: 'center',
            fontSize: '14px',
          }}
        >
          {SCHOOL.shortName}
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={student.full_name}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#c9a94e',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                }}
              >
                {firstLetter}
              </div>
            )}
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>
                {student.full_name}
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                {student.id} · Week {student.joining_week ?? '—'}
                {student.joining_date ? ` · ${student.joining_date}` : ''}
              </p>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: '4px',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: student.is_active ? '#dcfce7' : '#f1f5f9',
                  color: student.is_active ? '#166534' : '#475569',
                }}
              >
                {student.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: '120px' }}>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a472a' }}>
                {stats.attendance}%
              </p>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Attendance</p>
              <div
                style={{
                  marginTop: '4px',
                  height: '6px',
                  background: '#e2e8f0',
                  borderRadius: '999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    background: '#1a472a',
                    borderRadius: '999px',
                    width: `${Math.min(stats.attendance, 100)}%`,
                  }}
                />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#c9a94e' }}>
                {stats.completion}%
              </p>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Completion</p>
              <div
                style={{
                  marginTop: '4px',
                  height: '6px',
                  background: '#e2e8f0',
                  borderRadius: '999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    background: '#c9a94e',
                    borderRadius: '999px',
                    width: `${Math.min(stats.completion, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <p style={{ marginTop: '16px', fontSize: '14px', color: '#475569' }}>
            ✅ {stats.r} · 🔄 {stats.m} · ⏳ {stats.x} · {stats.total} total
          </p>

          <div
            style={{
              marginTop: '20px',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '12px',
            }}
          >
            <h2
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '8px',
              }}
            >
              Weekly
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {weekly.map((w) => (
                <div
                  key={w.week}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 500,
                      color: '#475569',
                      width: '32px',
                    }}
                  >
                    W{w.week}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      marginLeft: '8px',
                      letterSpacing: '1px',
                    }}
                  >
                    {w.emojis}
                  </span>
                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>
                    {w.attendance}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {achievements.length > 0 && (
            <div
              style={{
                marginTop: '20px',
                borderTop: '1px solid #f1f5f9',
                paddingTop: '12px',
              }}
            >
              <h2
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '4px',
                }}
              >
                Achievements
              </h2>
              <ul
                style={{
                  fontSize: '14px',
                  color: '#475569',
                  listStyle: 'none',
                  padding: 0,
                }}
              >
                {achievements.slice(0, 3).map((a) => (
                  <li key={a.id} style={{ padding: '2px 0' }}>
                    • {a.title}
                    {a.date ? ` — ${a.date}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: '24px',
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>
          Detailed Breakdown
        </h2>

        <h3
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#334155',
            marginBottom: '8px',
          }}
        >
          All Sessions
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {applicable.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '14px',
                padding: '4px 0',
                borderBottom: '1px solid #f8fafc',
              }}
            >
              <span style={{ color: '#475569' }}>
                {new Date(r.date + 'T00:00:00Z').toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              <span>
                {STATUS_LABELS[r.status]?.emoji} {STATUS_LABELS[r.status]?.label}
              </span>
            </div>
          ))}
        </div>

        <h3
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#334155',
            marginTop: '16px',
            marginBottom: '8px',
          }}
        >
          Achievements
        </h3>
        {achievements.length === 0 ? (
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            No achievements recorded yet.
          </p>
        ) : (
          <ul
            style={{
              fontSize: '14px',
              color: '#475569',
              listStyle: 'none',
              padding: 0,
            }}
          >
            {achievements.map((a) => (
              <li key={a.id} style={{ padding: '4px 0' }}>
                <span style={{ fontWeight: 500 }}>{a.title}</span>
                {a.category && (
                  <span style={{ color: '#64748b' }}> — {a.category}</span>
                )}
                {a.date && (
                  <span style={{ color: '#94a3b8' }}> ({a.date})</span>
                )}
                {a.description && (
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      marginTop: '2px',
                    }}
                  >
                    {a.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer
        style={{
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '12px', color: '#94a3b8' }}>
          © {new Date().getFullYear()} {SCHOOL.shortName}
        </p>
        <Link
          href="/admin"
          style={{
            display: 'inline-block',
            marginTop: '8px',
            fontSize: '12px',
            color: '#94a3b8',
          }}
        >
          Admin
        </Link>
      </footer>
    </main>
  );
}