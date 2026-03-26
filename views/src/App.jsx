import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards'
import { Welcome } from './pages/Welcome'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import { MemberDetail } from './pages/MemberDetails'
import { HelpPage } from './pages/HelperPage'
import Cycles from './pages/Cycles'
import Loans from './pages/Loans'
import Savings from './pages/Savings'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import './App.css'

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
}

function App() {
  return (
    <Router future={routerFuture}>
      <div className="App">
        <main className="main-content">
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/members" element={<Members />} />
                <Route path="/dashboard/members/:memberId" element={<MemberDetail />} />
                <Route path="/dashboard/help" element={<HelpPage />} />
                <Route path="/dashboard/record-savings" element={<Savings />} />
                <Route path="/dashboard/disburse-loan" element={<Loans />} />
                <Route path="/dashboard/record-repayment" element={<Cycles />} />
                <Route path="/dashboard/shareout" element={<Cycles />} />
              </Route>
            </Route>
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
