import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

const HomePage = lazy(() => import('./pages/HomePage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const ProductListPage = lazy(() => import('./pages/ProductListPage'))
const ProductCreatePage = lazy(() => import('./pages/ProductCreatePage'))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="page-loading">페이지를 불러오고 있습니다...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/products" element={<ProductListPage />} />
          <Route path="/admin/products/new" element={<ProductCreatePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
