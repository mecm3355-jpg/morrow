import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from './components/AdminRoute'
import './App.css'

const HomePage = lazy(() => import('./pages/HomePage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const ProductListPage = lazy(() => import('./pages/ProductListPage'))
const ProductCreatePage = lazy(() => import('./pages/ProductCreatePage'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const OrderPage = lazy(() => import('./pages/OrderPage'))
const OrderResultPage = lazy(() => import('./pages/OrderResultPage'))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="page-loading">페이지를 불러오고 있습니다...</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/order/result" element={<OrderResultPage />} />
          <Route path="/order/result/:orderId" element={<OrderResultPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/products" element={<ProductListPage />} />
            <Route path="/admin/products/new" element={<ProductCreatePage />} />
            <Route path="/admin/products/:productId/edit" element={<ProductCreatePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
