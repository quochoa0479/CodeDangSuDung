import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined, RocketFilled, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      await login(values);
      message.success('Đăng nhập thành công!');
      navigate('/');
    } catch (err: any) {
      message.error(err.message || 'Tài khoản hoặc mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: 'admin' | 'analyst') => {
    const creds = role === 'admin'
      ? { username: 'admin', password: 'admin123' }
      : { username: 'analyst', password: 'analyst123' };

    form.setFieldsValue(creds);
    handleFinish(creds);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          top: '10%',
          left: '20%',
          filter: 'blur(40px)',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, transparent 70%)',
          bottom: '15%',
          right: '25%',
          filter: 'blur(40px)',
          zIndex: 0,
        }}
      />

      <Card
        className="glass-card animate-fade-up"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '24px 16px',
          zIndex: 1,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'var(--primary-gradient)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '28px',
              marginBottom: '16px',
              boxShadow: '0 0 25px rgba(99, 102, 241, 0.5)',
            }}
          >
            <RocketFilled />
          </div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              marginBottom: '6px',
              letterSpacing: '-0.02em',
            }}
          >
            <span className="gradient-text">RFM Analytics</span>
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
              placeholder="admin hoặc analyst"
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
              placeholder="Mật khẩu"
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

        <div style={{ marginTop: '28px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '12px' }}>
            ⚡ Tài khoản Demo 1-Click:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Button
              ghost
              icon={<SafetyCertificateOutlined />}
              onClick={() => handleQuickLogin('admin')}
              style={{ borderRadius: '8px', fontSize: '12px', borderColor: 'rgba(99, 102, 241, 0.4)', color: '#A5B4FC' }}
            >
              Admin (admin)
            </Button>
            <Button
              ghost
              icon={<UserOutlined />}
              onClick={() => handleQuickLogin('analyst')}
              style={{ borderRadius: '8px', fontSize: '12px', borderColor: 'rgba(236, 72, 153, 0.4)', color: '#F472B6' }}
            >
              Analyst (analyst)
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
