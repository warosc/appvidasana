import React, { useEffect, useState, useCallback } from 'react'
import {
  Table,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  Typography,
  Alert,
  Spin,
  Space,
  Tooltip,
  message,
} from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { get, post, patch } from '../api/client'

const { Title } = Typography

interface User {
  id: number | string
  username: string
  name: string
  role: string
  isActive: boolean
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'red' },
  bodeguero: { label: 'Bodeguero', color: 'green' },
  ventas: { label: 'Ventas', color: 'blue' },
  compras: { label: 'Compras', color: 'orange' },
  auditor: { label: 'Auditor', color: 'purple' },
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await get<User[]>('/users')
      setUsers(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const openCreate = () => {
    setEditingUser(null)
    form.resetFields()
    form.setFieldsValue({ isActive: true, role: 'bodeguero' })
    setDrawerOpen(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue({
      username: user.username,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      if (editingUser) {
        const payload: Record<string, unknown> = {
          name: values.name,
          role: values.role,
          isActive: values.isActive,
        }
        if (values.password) payload.password = values.password
        await patch(`/users/${editingUser.id}`, payload)
        messageApi.success('Usuario actualizado correctamente')
      } else {
        await post('/users', values)
        messageApi.success('Usuario creado correctamente')
      }
      setDrawerOpen(false)
      fetchUsers()
    } catch (err: unknown) {
      if (err instanceof Error && !err.message.includes('validate')) {
        messageApi.error(err.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: 'Usuario',
      dataIndex: 'username',
      key: 'username',
      render: (v: string) => <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{v}</code>,
    },
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    {
      title: 'Rol',
      dataIndex: 'role',
      key: 'role',
      render: (v: string) => {
        const info = ROLE_LABELS[v] || { label: v, color: 'default' }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) =>
        v ? <Tag color="success">Activo</Tag> : <Tag color="default">Inactivo</Tag>,
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Tooltip title="Editar">
          <Button
            icon={React.createElement(EditOutlined)}
            size="small"
            onClick={() => openEdit(record)}
          />
        </Tooltip>
      ),
    },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      {contextHolder}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Usuarios
        </Title>
        <Button
          type="primary"
          icon={React.createElement(PlusOutlined)}
          onClick={openCreate}
        >
          Nuevo Usuario
        </Button>
      </div>

      {error && (
        <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      <Table
        dataSource={users.map((u) => ({ ...u, key: u.id }))}
        columns={columns}
        size="middle"
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: 'No hay usuarios registrados' }}
        scroll={{ x: true }}
      />

      <Drawer
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={440}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={handleSave}>
              Guardar
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" size="middle">
          <Form.Item
            name="username"
            label="Nombre de Usuario"
            rules={[
              { required: true, message: 'El nombre de usuario es requerido' },
              { min: 3, message: 'Mínimo 3 caracteres' },
            ]}
          >
            <Input
              placeholder="usuario"
              disabled={!!editingUser}
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Nombre Completo"
            rules={[{ required: true, message: 'El nombre es requerido' }]}
          >
            <Input placeholder="Nombre y apellido" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Rol"
            rules={[{ required: true, message: 'Seleccione un rol' }]}
          >
            <Select
              options={[
                { value: 'admin', label: 'Administrador' },
                { value: 'bodeguero', label: 'Bodeguero' },
                { value: 'ventas', label: 'Ventas' },
                { value: 'compras', label: 'Compras' },
                { value: 'auditor', label: 'Auditor' },
              ]}
              placeholder="Seleccionar rol"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
            rules={
              editingUser
                ? []
                : [
                    { required: true, message: 'La contraseña es requerida' },
                    { min: 6, message: 'Mínimo 6 caracteres' },
                  ]
            }
          >
            <Input.Password
              placeholder={editingUser ? 'Dejar vacío para no cambiar' : 'Contraseña segura'}
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item name="isActive" label="Estado" valuePropName="checked">
            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}
