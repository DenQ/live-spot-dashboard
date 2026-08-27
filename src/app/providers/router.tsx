import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { DashboardPage } from '@pages/dashboard'
import { routes } from '@shared/config'

export function AppRouter() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path={routes.dashboard} element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}
