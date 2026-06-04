import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { ROUTES } from '../lib/constants';
import { AdminLayout } from '../layouts/AdminLayout';
import { SellerLayout } from '../layouts/SellerLayout';
import { AdminHomePage } from '../pages/admin/AdminHomePage';
import { BuyersListPage } from '../pages/admin/buyers/BuyersListPage';
import { AdminProductsListPage } from '../pages/admin/products/AdminProductsListPage';
import { AdminReviewsListPage } from '../pages/admin/reviews/AdminReviewsListPage';
import { ReportsListPage } from '../pages/admin/reports/ReportsListPage';
import { AdminOrdersListPage } from '../pages/admin/orders/AdminOrdersListPage';
import { AdminOrderDetailPage } from '../pages/admin/orders/AdminOrderDetailPage';
import { SupportInboxPage } from '../pages/admin/support/SupportInboxPage';
import { SellersListPage } from '../pages/admin/sellers/SellersListPage';
import { PickupPointsListPage } from '../pages/admin/pickup-points/PickupPointsListPage';
import { CallbackPage } from '../pages/auth/CallbackPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RecoverPasswordPage } from '../pages/auth/RecoverPasswordPage';
import { ComingSoonPage } from '../pages/ComingSoonPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ImageUploadDemoPage } from '../pages/seller/ImageUploadDemoPage';
import { OrderDetailPage } from '../pages/seller/orders/OrderDetailPage';
import { OrdersListPage } from '../pages/seller/orders/OrdersListPage';
import { ProductFormPage } from '../pages/seller/products/ProductFormPage';
import { ProductsListPage } from '../pages/seller/products/ProductsListPage';
import { ChatRoomPage } from '../pages/seller/chats/ChatRoomPage';
import { ChatsListPage } from '../pages/seller/chats/ChatsListPage';
import { SupportChatPage } from '../pages/seller/support/SupportChatPage';
import { ReviewsListPage } from '../pages/seller/reviews/ReviewsListPage';
import { DashboardPage } from '../pages/seller/dashboard/DashboardPage';
import { StoreProfilePage } from '../pages/seller/store/StoreProfilePage';

import { HomeRedirect } from './HomeRedirect';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGate } from './RoleGate';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.recover} element={<RecoverPasswordPage />} />
        <Route path={ROUTES.authCallback} element={<CallbackPage />} />
        <Route path={ROUTES.forbidden} element={<ForbiddenPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleGate allow={['SELLER']} />}>
            <Route
              path={ROUTES.sellerRoot}
              element={
                <ErrorBoundary>
                  <SellerLayout />
                </ErrorBoundary>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="products/new" element={<ProductFormPage />} />
              <Route path="products/:productId/edit" element={<ProductFormPage />} />
              <Route path="products" element={<ProductsListPage />} />
              <Route path="orders/:orderId" element={<OrderDetailPage />} />
              <Route path="orders" element={<OrdersListPage />} />
              <Route path="chats/:conversationId" element={<ChatRoomPage />} />
              <Route path="chats" element={<ChatsListPage />} />
              <Route path="support" element={<SupportChatPage />} />
              <Route path="reviews" element={<ReviewsListPage />} />
              <Route path="store" element={<StoreProfilePage />} />
              <Route path="upload-demo" element={<ImageUploadDemoPage />} />
            </Route>
          </Route>

          <Route element={<RoleGate allow={['ADMIN']} />}>
            <Route
              path={ROUTES.adminRoot}
              element={
                <ErrorBoundary>
                  <AdminLayout />
                </ErrorBoundary>
              }
            >
              <Route index element={<AdminHomePage />} />
              <Route path="sellers" element={<SellersListPage />} />
              <Route
                path="sellers/:sellerId"
                element={<ComingSoonPage title="Perfil del vendedor" />}
              />
              <Route path="buyers" element={<BuyersListPage />} />
              <Route path="products" element={<AdminProductsListPage />} />
              <Route path="reviews" element={<AdminReviewsListPage />} />
              <Route path="reports" element={<ReportsListPage />} />
              <Route path="orders/:id" element={<AdminOrderDetailPage />} />
              <Route path="orders" element={<AdminOrdersListPage />} />
              <Route path="support" element={<SupportInboxPage />} />
              <Route path="pickup-points" element={<PickupPointsListPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
