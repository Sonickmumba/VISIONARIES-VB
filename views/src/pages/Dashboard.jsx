import { useState, useEffect } from 'react'
import './Dashboard.css'

function Dashboard() {
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalCycles: 0,
    totalLoans: 0,
    totalSavings: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const [groupsRes, cyclesRes, loansRes, savingsRes] = await Promise.all([
          fetch('/api/groups', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch('/api/cycles', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch('/api/loans', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch('/api/savings', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
        ])

        if (groupsRes.ok) {
          const data = await groupsRes.json()
          setStats((prev) => ({ ...prev, totalGroups: data.length || 0 }))
        }
        if (cyclesRes.ok) {
          const data = await cyclesRes.json()
          setStats((prev) => ({ ...prev, totalCycles: data.length || 0 }))
        }
        if (loansRes.ok) {
          const data = await loansRes.json()
          setStats((prev) => ({ ...prev, totalLoans: data.length || 0 }))
        }
        if (savingsRes.ok) {
          const data = await savingsRes.json()
          setStats((prev) => ({ ...prev, totalSavings: data.length || 0 }))
        }
      } catch (err) {
        setError('Failed to load dashboard data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div className="dashboard"><p>Loading dashboard...</p></div>
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      {error && <p className="error">{error}</p>}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Groups</h3>
            <p className="stat-number">{stats.totalGroups}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <h3>Cycles</h3>
            <p className="stat-number">{stats.totalCycles}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Loans</h3>
            <p className="stat-number">{stats.totalLoans}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏦</div>
          <div className="stat-content">
            <h3>Savings</h3>
            <p className="stat-number">{stats.totalSavings}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
