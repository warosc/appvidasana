import React, { useEffect, useState, useCallback } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  Tag,
  Typography,
  Alert,
  Spin,
  Space,
  message,
  Divider,
  Row,
  Col,
  Popconfirm,
} from 'antd'
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { get, post, patch } from '../api/client'

const { Title, Text } = Typography

interface SaleItem {
  productId: number | string
  quantity: number
  unit: string
  price: number
}

interface Sale {
  id: number | string
  createdAt: string
  customerName: string | null
  status: string
  totalItems?: number
}

interface Customer {
  id: number | string
  name: string
}

interface Product {
  id: number | string
  name: string
  baseUnit: string
  isActive: boolean
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'orange' },
  confirmed: { label: 'Confirmada', color: 'blue' },
  delivered: { label: 'Entregada', color: 'green' },
  cancelled: { label: 'Cancelada', color: 'red' },
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState<string | number | null>(null)
  const [form] = Form.useForm()
  const [items, setItems] = useState<SaleItem[]>([
    { productId: '', quantity: 1, unit: 'kg', price: 0 },
  ])
  const [messageApi, contextHolder] = message.useMessage()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sl, custs, prods] = await Promise.all([
        get<Sale[]>('/sales'),
        get<Customer[]>('/customers'),
        get<Product[]>('/products'),
      ])
      setSales(sl)
      setCustomers(custs)
      setProducts(prods.filter((p) => p.isActive))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar ventas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openModal = () => {
    form.resetFields()
    setItems([{ productId: '', quantity: 1, unit: 'kg', price: 0 }])
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const validItems = items.filter((it) => it.productId)
      if (validItems.length === 0) {
        messageApi.warning('Debe agregar al menos un producto')
        return
      }
      setSaving(true)
      await post('/sales', { ...values, items: validItems })
      messageApi.success('Venta registrada correctamente')
      setModalOpen(false)
      fetchData()
    } catch (err: unknown) {
      if (err instanceof Error && !err.message.includes('validate')) {
        messageApi.error(err.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const confirmSale = async (id: string | number) => {
    setConfirming(id)
    try {
      await patch(`/sales/${id}`, { status: 'confirmed' })
      messageApi.success('Venta confirmada')
      fetchData()
    } catch (err: unknown) {
      messageApi.error(err instanceof Error ? err.message : 'Error al confirmar')
    } finally {
      setConfirming(null)
    }
  }

  const addItem = () => {
    setItems([...items, { productId: '', quantity: 1, unit: 'kg', price: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof SaleItem, value: unknown) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
      sorter: (a: Sale, b: Sale) =>
        dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Cliente',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (v: string | null) => v || <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'Ítems',
      dataIndex: 'totalItems',
      key: 'totalItems',
      render: (v: number) => v ?? '—',
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => {
        const info = STATUS_LABELS[v] || { label: v, color: 'default' }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: Sale) =>
        record.status === 'pending' ? (
          <Popconfirm
            title="¿Confirmar esta venta?"
            onConfirm={() => confirmSale(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button
              size="small"
              type="primary"
              icon={React.createElement(CheckCircleOutlined)}
              loading={confirming === record.id}
            >
              Confirmar
            </Button>
          </Popconfirm>
        ) : null,
    },
  ]

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.baseUnit})`,
  }))

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
          Ventas
        </Title>
        <Button type="primary" icon={React.createElement(PlusOutlined)} onClick={openModal}>
          Nueva Venta
        </Button>
      </div>

      {error && (
        <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      <Table
        dataSource={sales.map((s) => ({ ...s, key: s.id }))}
        columns={columns}
        size="middle"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        locale={{ emptyText: 'Sin registros de ventas' }}
        scroll={{ x: true }}
      />

      <Modal
        title="Nueva Venta"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText="Registrar"
        cancelText="Cancelar"
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="middle" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customerId" label="Cliente">
                <Select
                  options={customers.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Seleccionar cliente (opcional)"
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reference" label="Referencia">
                <Input placeholder="Número de pedido, etc." />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label="Nota">
            <Input.TextArea rows={2} placeholder="Observaciones" />
          </Form.Item>

          <Divider>Productos</Divider>

          {items.map((item, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                padding: '12px 12px 0',
                marginBottom: 12,
                background: '#fafafa',
              }}
            >
              <Row gutter={12} align="middle">
                <Col span={8}>
                  <Form.Item label="Producto" style={{ marginBottom: 8 }}>
                    <Select
                      options={productOptions}
                      value={item.productId || undefined}
                      onChange={(v) => updateItem(index, 'productId', v)}
                      placeholder="Producto"
                      showSearch
                      filterOption={(input, option) =>
                        String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={5}>
                  <Form.Item label="Cantidad" style={{ marginBottom: 8 }}>
                    <InputNumber
                      min={0.01}
                      step={0.01}
                      value={item.quantity}
                      onChange={(v) => updateItem(index, 'quantity', v ?? 1)}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item label="Unidad" style={{ marginBottom: 8 }}>
                    <Select
                      value={item.unit}
                      onChange={(v) => updateItem(index, 'unit', v)}
                      options={[
                        { value: 'kg', label: 'kg' },
                        { value: 'caja', label: 'Caja' },
                        { value: 'pieza', label: 'Pieza' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={5}>
                  <Form.Item label="Precio Unit." style={{ marginBottom: 8 }}>
                    <InputNumber
                      min={0}
                      step={0.01}
                      value={item.price}
                      onChange={(v) => updateItem(index, 'price', v ?? 0)}
                      style={{ width: '100%' }}
                      prefix="$"
                    />
                  </Form.Item>
                </Col>
                <Col span={2} style={{ paddingTop: 4 }}>
                  <Form.Item label=" " style={{ marginBottom: 8 }}>
                    <Button
                      type="text"
                      danger
                      icon={React.createElement(DeleteOutlined)}
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          ))}

          <Button
            type="dashed"
            onClick={addItem}
            block
            icon={React.createElement(PlusOutlined)}
          >
            Agregar producto
          </Button>

          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <Text type="secondary">
              Total ítems: <strong>{items.filter((i) => i.productId).length}</strong>
            </Text>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
