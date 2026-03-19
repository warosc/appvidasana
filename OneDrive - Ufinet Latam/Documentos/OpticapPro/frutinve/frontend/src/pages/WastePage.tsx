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
  Row,
  Col,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { get, post } from '../api/client'

const { Title } = Typography

interface WasteRecord {
  id: number | string
  createdAt: string
  productName: string
  warehouseName: string
  quantity: number
  unit: string
  reason: string
  responsible: string | null
  note: string | null
}

interface Product {
  id: number | string
  name: string
  baseUnit: string
  isActive: boolean
}

interface Warehouse {
  id: number | string
  name: string
  isActive: boolean
}

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  vencimiento: { label: 'Vencimiento', color: 'orange' },
  daño: { label: 'Daño', color: 'red' },
  robo: { label: 'Robo', color: 'purple' },
  otro: { label: 'Otro', color: 'default' },
}

export default function WastePage() {
  const [records, setRecords] = useState<WasteRecord[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [waste, prods, whs] = await Promise.all([
        get<WasteRecord[]>('/waste'),
        get<Product[]>('/products'),
        get<Warehouse[]>('/warehouses'),
      ])
      setRecords(waste)
      setProducts(prods.filter((p) => p.isActive))
      setWarehouses(whs.filter((w) => w.isActive))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar mermas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openModal = () => {
    form.resetFields()
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await post('/waste', values)
      messageApi.success('Merma registrada correctamente')
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

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
      sorter: (a: WasteRecord, b: WasteRecord) =>
        dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      defaultSortOrder: 'descend' as const,
    },
    { title: 'Producto', dataIndex: 'productName', key: 'productName' },
    { title: 'Bodega', dataIndex: 'warehouseName', key: 'warehouseName' },
    {
      title: 'Cantidad',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (v: number, row: WasteRecord) => `${Number(v).toFixed(2)} ${row.unit}`,
    },
    {
      title: 'Razón',
      dataIndex: 'reason',
      key: 'reason',
      render: (v: string) => {
        const info = REASON_LABELS[v] || { label: v, color: 'default' }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: 'Responsable',
      dataIndex: 'responsible',
      key: 'responsible',
      render: (v: string | null) => v || '—',
    },
    {
      title: 'Nota',
      dataIndex: 'note',
      key: 'note',
      render: (v: string | null) => v || '—',
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
          Mermas
        </Title>
        <Button type="primary" icon={React.createElement(PlusOutlined)} onClick={openModal}>
          Registrar Merma
        </Button>
      </div>

      {error && (
        <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      <Table
        dataSource={records.map((r) => ({ ...r, key: r.id }))}
        columns={columns}
        size="middle"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        locale={{ emptyText: 'Sin registros de mermas' }}
        scroll={{ x: true }}
      />

      <Modal
        title="Registrar Merma"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText="Registrar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="middle" style={{ marginTop: 16 }}>
          <Form.Item
            name="productId"
            label="Producto"
            rules={[{ required: true, message: 'Seleccione un producto' }]}
          >
            <Select
              options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.baseUnit})` }))}
              placeholder="Seleccionar producto"
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            name="warehouseId"
            label="Bodega"
            rules={[{ required: true, message: 'Seleccione una bodega' }]}
          >
            <Select
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              placeholder="Seleccionar bodega"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="Cantidad"
                rules={[{ required: true, message: 'Ingrese la cantidad' }]}
              >
                <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="Unidad"
                rules={[{ required: true, message: 'Seleccione unidad' }]}
              >
                <Select
                  options={[
                    { value: 'kg', label: 'kg' },
                    { value: 'caja', label: 'Caja' },
                    { value: 'pieza', label: 'Pieza' },
                  ]}
                  placeholder="Unidad"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="reason"
            label="Razón"
            rules={[{ required: true, message: 'Seleccione la razón' }]}
          >
            <Select
              options={[
                { value: 'vencimiento', label: 'Vencimiento' },
                { value: 'daño', label: 'Daño' },
                { value: 'robo', label: 'Robo' },
                { value: 'otro', label: 'Otro' },
              ]}
              placeholder="Seleccionar razón"
            />
          </Form.Item>

          <Form.Item name="responsible" label="Responsable">
            <Input placeholder="Nombre del responsable" />
          </Form.Item>

          <Form.Item name="note" label="Nota">
            <Input.TextArea rows={2} placeholder="Observaciones" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
