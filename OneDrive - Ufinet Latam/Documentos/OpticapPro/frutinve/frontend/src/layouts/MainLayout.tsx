import React, { useState } from 'react'
import { Layout, Menu, Button, Avatar, Space, Typography, theme } from 'antd'
import {
  DashboardOutlined,
  ShoppingOutlined,
  BankOutlined,
  InboxOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  AlertOutlined,
  FileTextOutlined,
  UserOutlined,
  AuditOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth'

const { Header, Sider, Content } = Layout
const { Text } = Typography

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { state, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()

  const role = state.user?.role

  const menuItems = [
    {
      key: '/dashboard',
      icon: React.createElement(DashboardOutlined),
      label: 'Dashboard',
    },
    {
      key: '/products',
      icon: React.createElement(ShoppingOutlined),
      label: 'Productos',
    },
    {
      key: '/warehouses',
      icon: React.createElement(BankOutlined),
      label: 'Bodegas',
    },
    {
      key: '/inventory',
      icon: React.createElement(InboxOutlined),
      label: 'Inventario',
    },
    {
      key: '/waste',
      icon: React.createElement(DeleteOutlined),
      label: 'Mermas',
    },
    {
      key: '/purchases',
      icon: React.createElement(ShoppingCartOutlined),
      label: 'Compras',
    },
    {
      key: '/sales',
      icon: React.createElement(TagsOutlined),
      label: 'Ventas',
    },
    {
      key: '/alarms',
      icon: React.createElement(AlertOutlined),
      label: 'Alarmas',
    },
    {
      key: '/reports',
      icon: React.createElement(FileTextOutlined),
      label: 'Reportes',
    },
    ...(role === 'admin'
      ? [
          {
            key: '/users',
            icon: React.createElement(UserOutlined),
            label: 'Usuarios',
          },
        ]
      : []),
    ...(role === 'admin' || role === 'auditor'
      ? [
          {
            key: '/audit',
            icon: React.createElement(AuditOutlined),
            label: 'Auditoría',
          },
        ]
      : []),
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const selectedKey = '/' + location.pathname.split('/')[1]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{ background: '#001529' }}
        width={220}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            paddingLeft: collapsed ? 0 : 16,
            color: '#52c41a',
            fontSize: collapsed ? 24 : 18,
            fontWeight: 700,
            letterSpacing: 1,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
          }}
        >
          {collapsed ? '🥝' : '🥝 Frutinve'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? React.createElement(MenuUnfoldOutlined) : React.createElement(MenuFoldOutlined)}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 64, height: 64 }}
          />
          <Space>
            <Avatar icon={React.createElement(UserOutlined)} style={{ backgroundColor: '#52c41a' }} />
            <Text strong>{state.user?.name || state.user?.username}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ({state.user?.role})
            </Text>
            <Button
              type="text"
              icon={React.createElement(LogoutOutlined)}
              onClick={handleLogout}
              danger
            >
              Salir
            </Button>
          </Space>
        </Header>
        <Content
          style={{
            margin: '16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
