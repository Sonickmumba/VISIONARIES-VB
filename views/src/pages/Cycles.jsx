import { useState, useEffect } from 'react'
import './List.css'

function Cycles() {
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCycles = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/cycles', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        if (response.ok) {
          const data = await response.json()
          setCycles(data)
        } else {
          throw new Error('Failed to fetch cycles')
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCycles()
  }, [])

  if (loading) return <div className="container"><p>Loading cycles...</p></div>
  if (error) return <div className="container error">{error}</div>

  return (
    <div className="container">
      <h1>Cycles</h1>
      {cycles.length === 0 ? (
        <p className="empty-state">No cycles found. Create one to get started!</p>
      ) : (
        <div className="list">
          {cycles.map((cycle) => (
            <div key={cycle.id} className="list-item">
              <h3>{cycle.name || 'Cycle'}</h3>
              <p>Status: {cycle.status}</p>
              <small>ID: {cycle.id}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Cycles
