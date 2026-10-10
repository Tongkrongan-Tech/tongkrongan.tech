import { lazy, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import './index.css'
import { PrefsProvider } from './lib/prefs'
import { StoreProvider } from './lib/store'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
const Claim = lazy(() => import('./pages/Claim').then((m) => ({ default: m.Claim })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })))
const Report = lazy(() => import('./pages/Report').then((m) => ({ default: m.Report })))
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })))
const Legal = lazy(() => import('./pages/Legal').then((m) => ({ default: m.Legal })))
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <PrefsProvider>
        <StoreProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="claim" element={<Claim />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="login" element={<Login />} />
                <Route path="reset" element={<ResetPassword />} />
                <Route path="report" element={<Report />} />
                <Route path="admin" element={<Admin />} />
                <Route path="terms" element={<Legal doc="terms" />} />
                <Route path="privacy" element={<Legal doc="privacy" />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </StoreProvider>
      </PrefsProvider>
    </MotionConfig>
  </StrictMode>,
)
