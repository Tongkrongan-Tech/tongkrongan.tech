import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import './index.css'
import { PrefsProvider } from './lib/prefs'
import { StoreProvider } from './lib/store'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Claim } from './pages/Claim'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { ResetPassword } from './pages/ResetPassword'
import { Report } from './pages/Report'
import { NotFound } from './pages/NotFound'

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
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </StoreProvider>
      </PrefsProvider>
    </MotionConfig>
  </StrictMode>,
)
