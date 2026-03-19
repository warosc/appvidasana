import React, { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Checkbox,
  Space,
  Tag,
  Typography,
  Alert,
  Spin,
  Tooltip,
  Popconfirm,
  message,
} from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { get, post, patch } from '../api/client'

const { Title } = Typography

interface Product {
  id: number | string
  code: string
  name: string
  type: string
  baseUnit: string
  conversionToKg: number | null
  expires: boolean
  minStock: number
  isActive: boolean
}

const TYPE_LABELS: Record<string, string> = {
  fruta: 'Fruta',
  verdura: 'Verdura',
  otro: 'Otro',
}

const UNIT_LABELS: Record<string, string> = {
  kg: 'kg',
  caja: 'Caja',
  pieza: 'Pieza',
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await get<Product[]>('/products')
      setProducts(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const openCreate = () => {
    setEditingProduct(null)
    form.resetFields()
    form.setFieldsValue({ isActive: true, expires: false, baseUnit: 'kg', type: 'fruta' })
    setDrawerOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    form.setFieldsValue({
      name: product.name,
      type: product.type,
      baseUnit: product.baseUnit,
      conversionToKg: product.conversionToKg,
      expires: product.expires,
      minStock: product.minStock,
      isActive: product.isActive,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      if (editingProduct) {
        await patch(`/products/${editingProduct.id}`, values)
        messageApi.success('Producto actualizado correctamente')
      } else {
        await post('/products', values)
        messageApi.success('Producto creado correctamente')
      }
      setDrawerOpen(false)
      fetchProducts()
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
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (v: string) => {
        const colors: Record<string, string> = {
          fruta: 'green',
          verdura: 'lime',
          otro: 'default',
        }
        return <Tag color={colors[v] || 'default'}>{TYPE_LABELS[v] || v}</Tag>
      },
    },
    {
      title: 'Unidad Base',
      dataIndex: 'baseUnit',
      key: 'baseUnit',
      render: (v: string) => UNIT_LABELS[v] || v,
    },
    {
      title: 'Conv. a Kg',
      dataIndex: 'conversionToKg',
      key: 'conversionToKg',
      render: (v: number | null) => (v != null ? v : '-'),
    },
    {
      title: 'Stock Mínimo',
      dataIndex: 'minStock',
      key: 'minStock',
    },
    {
      title: 'Vence',
      dataIndex: 'expires',
      key: 'expires',
      render: (v: boolean) => (v ? <Tag color="orange">Sí</Tag> : <Tag>No</Tag>),
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
      render: (_: unknown, record: Product) => (
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
          Productos
        </Title>
        <Button
          type="primary"
          icon={React.createElement(PlusOutlined)}
          onClick={openCreate}
        >
          Nuevo Producto
        </Button>
      </div>

      {error && (
        <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      <Table
        dataSource={products.map((p) => ({ ...p, key: p.id }))}
        columns={columns}
        size="middle"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        locale={{ emptyText: 'No hay productos registrados' }}
        scroll={{ x: true }}
      />

      <Drawer
        title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={480}
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
            <Input placeholder="Nombre del producto" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Tipo"
            rules={[{ required: true, message: 'Seleccione el tipo' }]}
          >
            <Select
              options={[
                { value: 'fruta', label: 'Fruta' },
                { value: 'verdura', label: 'Verdura' },
                { value: 'otro', label: 'Otro' },
              ]}
              placeholder="Seleccionar tipo"
            />
          </Form.Item>

          <Form.Item
            name="baseUnit"
            label="Unidad Base"
            rules={[{ required: true, message: 'Seleccione la unidad' }]}
          >
            <Select
              options={[
                { value: 'kg', label: 'Kilogramo (kg)' },
                { value: 'caja', label: 'Caja' },
                { value: 'pieza', label: 'Pieza' },
              ]}
              placeholder="Seleccionar unidad"
            />
          </Form.Item>

          <Form.Item name="conversionToKg" label="Conversión a Kg (opcional)">
            <InputNumber
              placeholder="Ej: 20 (1 caja = 20 kg)"
              style={{ width: '100%' }}
              min={0}
              step={0.01}
            />
          </Form.Item>

          <Form.Item name="minStock" label="Stock Mínimo">
            <InputNumber min={0} step={1} style={{ width: '100%' }} defaultValue={0} />
          </Form.Item>

          <Form.Item name="expires" valuePropName="checked">
            <Checkbox>Producto con vencimiento</Checkbox>
          </Form.Item>

          <Form.Item name="isActive" label="Estado" valuePropName="checked">
            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}
