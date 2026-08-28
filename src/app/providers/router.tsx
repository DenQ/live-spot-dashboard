import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { DashboardPage } from '@pages/dashboard'
import { TrainerPage } from '@pages/trainer'
import { routes } from '@shared/config'

export function AppRouter() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path={routes.dashboard} element={<DashboardPage />} />
        <Route path={routes.trainer} element={<TrainerPage />} />
      </Routes>
    </BrowserRouter>
  )
}
