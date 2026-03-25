import { useState, useEffect } from 'react'
import './List.css'

function Savings() {
  const [savings, setSavings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSavings = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/savings', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        if (response.ok) {
          const data = await response.json()
          setSavings(data)
        } else {
          throw new Error('Failed to fetch savings')
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchSavings()
  }, [])

  if (loading) return <div className="container"><p>Loading savings...</p></div>
  if (error) return <div className="container error">{error}</div>

  return (
    <div className="container">
      <h1>Savings</h1>
      {savings.length === 0 ? (
        <p className="empty-state">No savings records found.</p>
      ) : (
        <div className="list">
          {savings.map((saving) => (
            <div key={saving.id} className="list-item">
              <h3>Saving #{saving.id}</h3>
              <p>Amount: ${saving.amount}</p>
              <p>Status: {saving.status}</p>
              <small>ID: {saving.id}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Savings
