import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import { ProtectedRoute, PublicOnlyRoute, AdminRoute } from './components/guards/RouteGuards'
import { fetchCurrentUser } from './store/slices/authSlice'
import { Welcome } from './pages/Welcome/Welcome'
import Dashboard from './pages/Dashboard/Dashboard'
import Members from './pages/Members/Members'
import { MemberDetail } from './pages/MemberDetails/MemberDetails'
import { HelpPage } from './pages/HelperPage/HelperPage'

import { RecordSavings } from './pages/RecordSaving/RecordSaving'
import { DisburseLoan } from './pages/DisburseLoan/DisburseLoan'
import { Groups } from './pages/Groups/Groups'
import { Login } from './pages/Login/Login'
import { Signup } from './pages/Signup/Signup'
import { CycleManagement } from './pages/CycleManagement/CycleManagement'
import { RecordRepayment } from './pages/RecordRepayment/RecordRepayment'
import { Approvals } from './pages/Approvals/Approvals'
import { ShareoutReport } from './pages/ShareoutReport/ShareoutReport'
import { MonthlyReport } from './pages/MonthlyReport/MonthlyReport'
import { CommonInterestCalculator } from './pages/CommonInterestCalculator/CommonInterestCalculator'

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
            <Route path="/dashboard" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="members" element={<Members />} />
              <Route path="members/:memberId" element={<MemberDetail />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="record-savings" element={<RecordSavings />} />
              <Route path="groups" element={<Groups />} />
              <Route path="disburse-loan" element={<DisburseLoan />} />
              <Route path="cycles" element={<CycleManagement />} />
              <Route path="notifications" element={<div className="p-4">Page not found</div>} />
              <Route path='record-repayment/:memberId?' element={<RecordRepayment />} />
              <Route path='shareout' element={<ShareoutReport />} />
              <Route path='shareout-report' element={<ShareoutReport />} />
              <Route path='monthly-report' element={<MonthlyReport />} />
              <Route path='common-interest' element={<CommonInterestCalculator />} />
              <Route element={<AdminRoute />}>
                <Route path='approvals' element={<Approvals />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </main>
    </div>
  )
}

export default App

