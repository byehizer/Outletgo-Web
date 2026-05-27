import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { ROUTES } from '../lib/constants';
import { AdminLayout } from '../layouts/AdminLayout';
import { SellerLayout } from '../layouts/SellerLayout';
import { AdminHomePage } from '../pages/admin/AdminHomePage';
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
import { SellerHomePage } from '../pages/seller/SellerHomePage';
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
            <Route path={ROUTES.sellerRoot} element={<SellerLayout />}>
              <Route index element={<SellerHomePage />} />
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
            <Route path={ROUTES.adminRoot} element={<AdminLayout />}>
              <Route index element={<AdminHomePage />} />
              <Route
                path="sellers"
                element={<ComingSoonPage title="Gestión de vendedores" />}
              />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
