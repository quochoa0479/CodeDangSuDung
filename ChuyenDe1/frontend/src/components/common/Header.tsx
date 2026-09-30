import React, { useState } from 'react';
import { Layout, Button, Avatar, Dropdown, message, Modal } from 'antd';
import {
  SyncOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { segmentApi } from '../../api/segmentApi';

const { Header: AntHeader } = Layout;

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [isCalculating, setIsCalculating] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    window.location.replace('/login');
  };

  const handleRecalculate = async () => {
    Modal.confirm({
      title: 'Kích hoạt tính toán phân loại khách hàng (RFM)?',
      content:
        'Hệ thống sẽ thực thi Stored Procedure sp_calculate_rfm() để phân tích toàn bộ lịch sử giao dịch và cập nhật phân vị NTILE(5) cho từng khách hàng.',
      okText: 'Chạy ngay',
      cancelText: 'Hủy',
      okButtonProps: { type: 'primary' },
      onOk: async () => {
        setIsCalculating(true);
        try {
          const res = await segmentApi.recalculate();
          message.success(res.message || 'Tính toán lại phân khúc khách hàng thành công!');
          setTimeout(() => {
            window.location.reload();
          }, 800);
        } catch (err: any) {
          message.error(err.message || 'Tính toán thất bại');
        } finally {
          setIsCalculating(false);
        }
      },
    });
  };

  const userMenuItems = [
    {
      key: 'user-info',
      disabled: true,
      label: (
        <div style={{ padding: '6px 4px' }}>
          <div style={{ fontWeight: 600, color: '#F8FAFC' }}>{user?.fullName || 'Người dùng'}</div>
          <div style={{ fontSize: '12px', color: isAdmin ? '#60A5FA' : '#C084FC' }}>
            Vai trò: {isAdmin ? 'Quản Trị Viên (ADMIN)' : 'Chuyên Viên Phân Tích (ANALYST)'}
          </div>
        </div>
      ),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      danger: true,
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader
      style={{
        background: '#0F172A',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: '64px',
      }}
    >
      {/* Left: Professional Subtitle / System context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#E2E8F0' }}>
          Hệ Thống Phân Tích & Phân Khúc Khách Hàng (RFM)
        </span>
      </div>

      {/* Right: Actions & User Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Only Admin can recalculate RFM */}
        {isAdmin && (
          <Button
            type="primary"
            icon={<SyncOutlined spin={isCalculating} />}
            loading={isCalculating}
            onClick={handleRecalculate}
            style={{
              height: '36px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '6px',
            }}
          >
            Tính toán lại RFM
          </Button>
        )}

        <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '5px 12px',
              borderRadius: '8px',
              background: '#1E293B',
              border: `1px solid ${isAdmin ? 'rgba(37, 99, 235, 0.3)' : 'rgba(147, 51, 234, 0.3)'}`,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <Avatar
              size={28}
              style={{
                backgroundColor: isAdmin ? '#2563EB' : '#9333EA',
                fontSize: '13px',
                fontWeight: 600,
              }}
              icon={<UserOutlined />}
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>
                {user?.fullName || (isAdmin ? 'Quản Trị Viên' : 'Chuyên Viên')}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  color: isAdmin ? '#60A5FA' : '#C084FC',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontWeight: 700,
                }}
              >
                {isAdmin ? 'ADMIN' : 'ANALYST'}
              </span>
            </div>
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  );
};
