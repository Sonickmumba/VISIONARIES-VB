import { useState, useEffect } from 'react'
import './List.css'

function Groups() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/groups', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        if (response.ok) {
          const data = await response.json()
          setGroups(data)
        } else {
          throw new Error('Failed to fetch groups')
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchGroups()
  }, [])

  if (loading) return <div className="container"><p>Loading groups...</p></div>
  if (error) return <div className="container error">{error}</div>

  return (
    <div className="container">
      <h1>Groups</h1>
      {groups.length === 0 ? (
        <p className="empty-state">No groups found. Create one to get started!</p>
      ) : (
        <div className="list">
          {groups.map((group) => (
            <div key={group.id} className="list-item">
              <h3>{group.name}</h3>
              <p>{group.description || 'No description'}</p>
              <small>ID: {group.id}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Groups
