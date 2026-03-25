import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Groups from './pages/Groups'
import Cycles from './pages/Cycles'
import Loans from './pages/Loans'
import Savings from './pages/Savings'
import Login from './pages/Login'
import Register from './pages/Register'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/cycles" element={<Cycles />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/savings" element={<Savings />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
