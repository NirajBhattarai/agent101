import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: '2rem', minHeight: '100vh' }}>
      <h1>Welcome to Agent101</h1>
      <p>Next.js application with AI agents powered by CopilotKit</p>
      <div style={{ marginTop: '2rem' }}>
        <h2>Available Features:</h2>
        <ul style={{ marginTop: '1rem', listStyle: 'none' }}>
          <li style={{ marginBottom: '1rem' }}>
            <Link 
              href="/chat" 
              style={{ 
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                transition: 'transform 0.2s'
              }}
            >
              💬 Chat with AI Agents
            </Link>
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <code>GET /api/health</code> - Health check endpoint
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <code>GET /api/users</code> - Get all users
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <code>POST /api/users</code> - Create a new user
          </li>
        </ul>
      </div>
    </main>
  )
}

