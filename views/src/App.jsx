import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards'
import { fetchCurrentUser } from './store/slices/authSlice'
import { Welcome } from './pages/Welcome'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import { MemberDetail } from './pages/MemberDetails'
import { HelpPage } from './pages/HelperPage'
import { RecordSavings } from './pages/RecordSaving'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'

import './App.css'

function App() {
  const dispatch = useDispatch();
  useEffect(() => { dispatch(fetchCurrentUser()); }, [dispatch]);
  return (
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
              <Route path="members" element={<Members />} />
              <Route path="members/:memberId" element={<MemberDetail />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="record-savings" element={<RecordSavings />} />


            </Route>
          </Route>
        </Routes>
      </main>
    </div>
  )
}

export default App

