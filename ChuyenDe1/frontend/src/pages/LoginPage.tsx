import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined, RocketFilled } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Redirect to dashboard immediately if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (isAuthenticated && token) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      await login(values);
      message.success('Đăng nhập thành công!');
      navigate('/', { replace: true });
    } catch (err: any) {
      message.error(err.message || 'Tài khoản hoặc mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: '#0B0F19',
      }}
    >
      <Card
        className="glass-card animate-fade-up"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '24px 16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          borderRadius: '12px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: '#2563EB',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '24px',
              marginBottom: '16px',
            }}
          >
            <RocketFilled />
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              marginBottom: '6px',
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
            }}
          >
            RFM Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Hệ thống Phân loại Khách hàng theo Hành vi (CĐ1)
          </p>
        </div>

        <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
          <Form.Item
            name="username"
            label={<span style={{ color: 'var(--text-secondary)' }}>Tên đăng nhập</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'var(--text-muted)' }} />}
              placeholder="Tên đăng nhập (username)"
              size="large"
              style={{ borderRadius: '10px', height: '46px' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ color: 'var(--text-secondary)' }}>Mật khẩu</span>}
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--text-muted)' }} />}
              placeholder="Mật khẩu (password)"
              size="large"
              style={{ borderRadius: '10px', height: '46px' }}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            style={{
              height: '46px',
              borderRadius: '10px',
              marginTop: '12px',
              fontSize: '15px',
            }}
          >
            Đăng nhập hệ thống
          </Button>
        </Form>
      </Card>
    </div>
  );
};
