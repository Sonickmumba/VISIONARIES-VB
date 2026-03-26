import { useState, useEffect } from 'react'


function Loans() {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/loans', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        if (response.ok) {
          const data = await response.json()
          setLoans(data)
        } else {
          throw new Error('Failed to fetch loans')
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchLoans()
  }, [])

  if (loading) return <div className="container"><p>Loading loans...</p></div>
  if (error) return <div className="container error">{error}</div>

  return (
    <div className="container">
      <h1>Loans</h1>
      {loans.length === 0 ? (
        <p className="empty-state">No loans found.</p>
      ) : (
        <div className="list">
          {loans.map((loan) => (
            <div key={loan.id} className="list-item">
              <h3>Loan #{loan.id}</h3>
              <p>Amount: ${loan.amount}</p>
              <p>Status: {loan.status}</p>
              <small>ID: {loan.id}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Loans
