import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Layout, ConfigProvider, theme } from 'antd';
import { Sidebar } from '../components/common/Sidebar';
import { Header } from '../components/common/Header';

const { Content } = Layout;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#2563EB',
          colorBgBase: '#0B0F19',
          colorBgContainer: '#131B2E',
          colorBorder: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          fontFamily: 'var(--font-main)',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#0B0F19' }}>
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
        <Layout style={{ background: '#0B0F19', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Header />
          <Content
            style={{
              padding: '24px 32px',
              maxWidth: '1600px',
              width: '100%',
              margin: '0 auto',
              flex: 1,
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};
