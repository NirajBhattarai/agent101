export default function Home() {
  return (
    <main style={{ padding: '2rem', minHeight: '100vh' }}>
      <h1>Welcome to Agent101</h1>
      <p>Next.js application with API endpoints</p>
      <div style={{ marginTop: '2rem' }}>
        <h2>Available API Endpoints:</h2>
        <ul style={{ marginTop: '1rem', listStyle: 'none' }}>
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

