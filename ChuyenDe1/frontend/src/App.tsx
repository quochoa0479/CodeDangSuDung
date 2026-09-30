import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Result, Button } from 'antd';
import { LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { RFMAnalysisPage } from './pages/RFMAnalysisPage';
import { ImportPage } from './pages/ImportPage';
import { MappingConfigPage } from './pages/MappingConfigPage';
import { ReportsPage } from './pages/ReportsPage';
import { LoginPage } from './pages/LoginPage';
import { useAuthStore } from './store/authStore';

// Protected Route Guard (Checks token in both memory & persistent storage)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const token = localStorage.getItem('auth_token');

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Admin-Only Route Guard (Enforces RBAC between Admin and Analyst)
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ maxWidth: '700px', margin: '60px auto', padding: '0 20px' }}>
        <Result
          status="403"
          icon={<LockOutlined style={{ color: '#F43F5E', fontSize: '64px' }} />}
          title={<span style={{ color: '#FFFFFF', fontWeight: 800 }}>403 - Giới Hạn Quyền Truy Cập</span>}
          subTitle={
            <div style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.6, marginTop: '8px' }}>
              Tài khoản <strong>Chuyên Viên Phân Tích (ANALYST)</strong> chỉ có quyền xem dữ liệu và báo cáo phân tích.
              <br />
              Chức năng <strong>Quản Trị Dữ Liệu</strong> (Import CSV, Cấu hình ánh xạ, Sinh dữ liệu) chỉ dành riêng cho <strong>Quản Trị Viên (ADMIN)</strong>.
            </div>
          }
          extra={[
            <Button
              key="back-dashboard"
              type="primary"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/')}
              style={{ borderRadius: '6px', fontWeight: 600, height: '40px' }}
            >
              Quay lại Dashboard Tổng quan
            </Button>,
          ]}
        />
      </div>
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();

    // Prevent Back/Forward Cache (bfcache) traversal when logged out:
    // If the browser restores a page from RAM cache after logout, immediately redirect to /login
    const handlePageShow = (event: PageTransitionEvent) => {
      const token = localStorage.getItem('auth_token');
      if (event.persisted && !token) {
        window.location.replace('/login');
      }
    };

    const handlePopState = () => {
      const token = localStorage.getItem('auth_token');
      if (!token && window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Application Routes wrapped in MainLayout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Shared Routes for both Admin and Analyst */}
          <Route index element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="rfm" element={<RFMAnalysisPage />} />
          <Route path="reports" element={<ReportsPage />} />

          {/* Admin-Only Routes */}
          <Route
            path="import"
            element={
              <AdminRoute>
                <ImportPage />
              </AdminRoute>
            }
          />
          <Route
            path="import/mappings"
            element={
              <AdminRoute>
                <MappingConfigPage />
              </AdminRoute>
            }
          />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
