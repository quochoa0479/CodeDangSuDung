import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  FireOutlined,
  CloudUploadOutlined,
  SettingOutlined,
  BarChartOutlined,
  AlertOutlined,
} from '@ant-design/icons';

import { useAuthStore } from '../../store/authStore';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  groupTitle?: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'ADMIN';

  const navGroups: NavGroup[] = [
    {
      groupTitle: 'PHÂN TÍCH & BÁO CÁO',
      items: [
        {
          key: '/',
          label: 'Dashboard Tổng quan',
          icon: <DashboardOutlined />,
        },
        {
          key: '/customers',
          label: 'Danh sách Khách hàng',
          icon: <TeamOutlined />,
        },
        {
          key: '/rfm',
          label: 'Ma trận RFM & Heatmap',
          icon: <FireOutlined />,
        },
        {
          key: '/reports',
          label: 'Báo cáo & Rủi ro rời bỏ',
          icon: <AlertOutlined />,
        },
      ],
    },
    // Only Admin can see Data Management menu
    ...(isAdmin
      ? [
          {
            groupTitle: 'QUẢN TRỊ DỮ LIỆU (ADMIN)',
            items: [
              {
                key: '/import',
                label: 'Nhập Dữ Liệu',
                icon: <CloudUploadOutlined />,
              },
              {
                key: '/import/mappings',
                label: 'Cấu hình Ánh xạ',
                icon: <SettingOutlined />,
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={250}
      theme="dark"
      style={{
        background: '#0B1120',
        borderRight: '1px solid rgba(255, 255, 255, 0.07)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
        zIndex: 101,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: collapsed ? '0 16px' : '0 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/')}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '16px',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
          }}
        >
          <BarChartOutlined />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#F8FAFC',
                letterSpacing: '0.03em',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              RFM ANALYTICS
            </div>
            <div
              style={{
                fontSize: '10px',
                color: '#64748B',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Customer Intelligence
            </div>
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 10px',
        }}
      >
        {navGroups.map((group, groupIdx) => (
          <div key={`group-${groupIdx}`} style={{ marginBottom: '20px' }}>
            {!collapsed && group.groupTitle && (
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#475569',
                  letterSpacing: '0.08em',
                  padding: '0 10px 8px 10px',
                  textTransform: 'uppercase',
                }}
              >
                {group.groupTitle}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {group.items.map((item) => {
                const isActive =
                  item.key === '/'
                    ? location.pathname === '/'
                    : location.pathname === item.key;

                return (
                  <div
                    key={item.key}
                    onClick={() => navigate(item.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: collapsed ? '10px' : '9px 12px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#FFFFFF' : '#94A3B8',
                      backgroundColor: isActive ? '#1E293B' : 'transparent',
                      borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent',
                      transition: 'background-color 0.15s ease, color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.color = '#F1F5F9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#94A3B8';
                      }
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <span
                      style={{
                        fontSize: '16px',
                        color: isActive ? '#60A5FA' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Footer */}
      {!collapsed && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '11px',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              background: isAdmin ? 'rgba(37, 99, 235, 0.15)' : 'rgba(147, 51, 234, 0.15)',
              color: isAdmin ? '#60A5FA' : '#C084FC',
              border: `1px solid ${isAdmin ? 'rgba(37, 99, 235, 0.3)' : 'rgba(147, 51, 234, 0.3)'}`,
            }}
          >
            {isAdmin ? 'ADMIN' : 'ANALYST'}
          </span>
          <span style={{ color: '#475569' }}>CĐ1 Enterprise</span>
        </div>
      )}
    </Sider>
  );
};
