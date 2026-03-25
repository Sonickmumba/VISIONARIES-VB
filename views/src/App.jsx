import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Groups from './pages/Groups'
import Cycles from './pages/Cycles'
import Loans from './pages/Loans'
import Savings from './pages/Savings'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/cycles" element={<Cycles />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/savings" element={<Savings />} />
            </Route>
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
