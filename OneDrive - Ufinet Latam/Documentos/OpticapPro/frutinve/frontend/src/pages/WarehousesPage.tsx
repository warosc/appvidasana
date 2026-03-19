import React, { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Drawer,
  Form,
  Input,
  Switch,
  Space,
  Tag,
  Typography,
  Alert,
  Spin,
  Tooltip,
  message,
} from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { get, post, patch } from '../api/client'

const { Title } = Typography

interface Warehouse {
  id: number | string
  code: string
  name: string
  location: string | null
  isActive: boolean
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()

  const fetchWarehouses = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await get<Warehouse[]>('/warehouses')
      setWarehouses(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar bodegas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWarehouses()
  }, [])

  const openCreate = () => {
    setEditingWarehouse(null)
    form.resetFields()
    form.setFieldsValue({ isActive: true })
    setDrawerOpen(true)
  }

  const openEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse)
    form.setFieldsValue({
      name: warehouse.name,
      location: warehouse.location,
      isActive: warehouse.isActive,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      if (editingWarehouse) {
        await patch(`/warehouses/${editingWarehouse.id}`, values)
        messageApi.success('Bodega actualizada correctamente')
      } else {
        await post('/warehouses', values)
        messageApi.success('Bodega creada correctamente')
      }
      setDrawerOpen(false)
      fetchWarehouses()
    } catch (err: unknown) {
      if (err instanceof Error) {
        messageApi.error(err.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: 'Código',
      dataIndex: 'code',
      key: 'code',
      width: 100,
    },
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Ubicación',
      dataIndex: 'location',
      key: 'location',
      render: (v: string | null) => v || <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) =>
        v ? <Tag color="success">Activa</Tag> : <Tag color="default">Inactiva</Tag>,
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: Warehouse) => (
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
          Bodegas
        </Title>
        <Button
          type="primary"
          icon={React.createElement(PlusOutlined)}
          onClick={openCreate}
        >
          Nueva Bodega
        </Button>
      </div>

      {error && (
        <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      <Table
        dataSource={warehouses.map((w) => ({ ...w, key: w.id }))}
        columns={columns}
        size="middle"
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: 'No hay bodegas registradas' }}
        scroll={{ x: true }}
      />

      <Drawer
        title={editingWarehouse ? 'Editar Bodega' : 'Nueva Bodega'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={420}
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
            name="name"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es requerido' }]}
          >
            <Input placeholder="Nombre de la bodega" />
          </Form.Item>

          <Form.Item name="location" label="Ubicación">
            <Input placeholder="Ej: Bloque A, Piso 1" />
          </Form.Item>

          <Form.Item name="isActive" label="Estado" valuePropName="checked">
            <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}
