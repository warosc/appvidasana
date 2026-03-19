import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { post } from '../api/client'
import { useAuth } from '../store/auth'
import type { AuthUser } from '../store/auth'

const { Title, Text } = Typography

interface LoginResponse {
  token: string
  user: AuthUser
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    setError(null)
    try {
      const res = await post<LoginResponse>('/auth/login', values)
      login(res.token, res.user)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          borderRadius: 12,
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🥝</div>
            <Title level={2} style={{ color: '#52c41a', margin: 0 }}>
              Frutinve
            </Title>
            <Text type="secondary">Sistema de Inventario de Frutas y Verduras</Text>
          </div>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          <Form
            name="login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="username"
              label="Usuario"
              rules={[{ required: true, message: 'Ingrese su usuario' }]}
            >
              <Input
                prefix={React.createElement(UserOutlined)}
                placeholder="Usuario"
                autoFocus
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Contraseña"
              rules={[{ required: true, message: 'Ingrese su contraseña' }]}
            >
              <Input.Password
                prefix={React.createElement(LockOutlined)}
                placeholder="Contraseña"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: 44 }}
              >
                Iniciar Sesión
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  )
}
