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
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>Vai trò: {user?.role || 'ADMIN'}</div>
        </div>
      ),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      danger: true,
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: logout,
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

        <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '5px 12px',
              borderRadius: '8px',
              background: '#1E293B',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <Avatar
              size={28}
              style={{ backgroundColor: '#2563EB', fontSize: '13px', fontWeight: 600 }}
              icon={<UserOutlined />}
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>
                {user?.fullName || 'Quản Trị Viên'}
              </span>
              <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {user?.role || 'ADMIN'}
              </span>
            </div>
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  );
};
