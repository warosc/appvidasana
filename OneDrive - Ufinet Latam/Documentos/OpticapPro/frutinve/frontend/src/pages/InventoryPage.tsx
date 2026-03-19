import React, { useEffect, useState, useCallback } from 'react'
import {
  Tabs,
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
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { get, post } from '../api/client'

const { Title, Text } = Typography

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

interface StockItem {
  productId: number | string
  warehouseId: number | string
  productName: string
  warehouseName: string
  stock: number
  unit: string
}

interface Movement {
  id: number | string
  createdAt: string
  productName: string
  warehouseName: string
  movementType: string
  quantity: number
  unit: string
  reference: string | null
  note: string | null
}

type ModalType = 'entry' | 'exit' | 'transfer' | null

const MOVEMENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  entry: { label: 'Entrada', color: 'green' },
  exit: { label: 'Salida', color: 'red' },
  transfer_in: { label: 'Traslado Entrada', color: 'blue' },
  transfer_out: { label: 'Traslado Salida', color: 'orange' },
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('stock')
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [stock, setStock] = useState<StockItem[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [loadingStock, setLoadingStock] = useState(true)
  const [loadingMovements, setLoadingMovements] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()

  const fetchStock = useCallback(async () => {
    setLoadingStock(true)
    setError(null)
    try {
      const data = await get<StockItem[]>('/inventory/stock')
      setStock(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar stock')
    } finally {
      setLoadingStock(false)
    }
  }, [])

  const fetchMovements = useCallback(async () => {
    setLoadingMovements(true)
    try {
      const data = await get<Movement[]>('/inventory/movements?limit=200&offset=0')
      setMovements(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar movimientos')
    } finally {
      setLoadingMovements(false)
    }
  }, [])

  const fetchMeta = useCallback(async () => {
    try {
      const [prods, whs] = await Promise.all([
        get<Product[]>('/products'),
        get<Warehouse[]>('/warehouses'),
      ])
      setProducts(prods.filter((p) => p.isActive))
      setWarehouses(whs.filter((w) => w.isActive))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchStock()
    fetchMeta()
  }, [fetchStock, fetchMeta])

  useEffect(() => {
    if (activeTab === 'movements') {
      fetchMovements()
    }
  }, [activeTab, fetchMovements])

  const openModal = (type: ModalType) => {
    form.resetFields()
    setModalType(type)
  }

  const closeModal = () => {
    setModalType(null)
    form.resetFields()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      if (modalType === 'entry') {
        await post('/inventory/entry', values)
        messageApi.success('Entrada registrada correctamente')
      } else if (modalType === 'exit') {
        await post('/inventory/exit', values)
        messageApi.success('Salida registrada correctamente')
      } else if (modalType === 'transfer') {
        await post('/inventory/transfer', values)
        messageApi.success('Traslado registrado correctamente')
      }
      closeModal()
      fetchStock()
      if (activeTab === 'movements') fetchMovements()
    } catch (err: unknown) {
      if (err instanceof Error && !err.message.includes('validate')) {
        messageApi.error(err.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const stockColumns = [
    { title: 'Producto', dataIndex: 'productName', key: 'productName' },
    { title: 'Bodega', dataIndex: 'warehouseName', key: 'warehouseName' },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
      render: (v: number, row: StockItem) => (
        <Text strong style={{ color: Number(v) <= 0 ? '#ff4d4f' : '#52c41a' }}>
          {Number(v).toFixed(2)} {row.unit}
        </Text>
      ),
      sorter: (a: StockItem, b: StockItem) => Number(a.stock) - Number(b.stock),
    },
  ]

  const movementColumns = [
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
      sorter: (a: Movement, b: Movement) =>
        dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      defaultSortOrder: 'descend' as const,
    },
    { title: 'Producto', dataIndex: 'productName', key: 'productName' },
    { title: 'Bodega', dataIndex: 'warehouseName', key: 'warehouseName' },
    {
      title: 'Tipo',
      dataIndex: 'movementType',
      key: 'movementType',
      render: (v: string) => {
        const info = MOVEMENT_TYPE_LABELS[v] || { label: v, color: 'default' }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: 'Cantidad',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (v: number, row: Movement) => `${Number(v).toFixed(2)} ${row.unit}`,
    },
    {
      title: 'Referencia',
      dataIndex: 'reference',
      key: 'reference',
      render: (v: string | null) => v || '—',
    },
    {
      title: 'Nota',
      dataIndex: 'note',
      key: 'note',
      render: (v: string | null) => v || '—',
    },
  ]

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.baseUnit})`,
  }))
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }))

  const renderMovementForm = () => (
    <>
      <Form.Item
        name="productId"
        label="Producto"
        rules={[{ required: true, message: 'Seleccione un producto' }]}
      >
        <Select options={productOptions} placeholder="Seleccionar producto" showSearch
          filterOption={(input, option) =>
            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
      </Form.Item>

      {modalType !== 'transfer' ? (
        <Form.Item
          name="warehouseId"
          label="Bodega"
          rules={[{ required: true, message: 'Seleccione una bodega' }]}
        >
          <Select options={warehouseOptions} placeholder="Seleccionar bodega" />
        </Form.Item>
      ) : (
        <>
          <Form.Item
            name="fromWarehouseId"
            label="Bodega Origen"
            rules={[{ required: true, message: 'Seleccione bodega origen' }]}
          >
            <Select options={warehouseOptions} placeholder="Bodega de origen" />
          </Form.Item>
          <Form.Item
            name="toWarehouseId"
            label="Bodega Destino"
            rules={[{ required: true, message: 'Seleccione bodega destino' }]}
          >
            <Select options={warehouseOptions} placeholder="Bodega de destino" />
          </Form.Item>
        </>
      )}

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

      <Form.Item name="reference" label="Referencia">
        <Input placeholder="Número de factura, guía, etc." />
      </Form.Item>
      <Form.Item name="note" label="Nota">
        <Input.TextArea rows={2} placeholder="Observaciones adicionales" />
      </Form.Item>
    </>
  )

  const modalTitles: Record<string, string> = {
    entry: 'Registrar Entrada',
    exit: 'Registrar Salida',
    transfer: 'Registrar Traslado',
  }

  const tabs = [
    {
      key: 'stock',
      label: 'Stock Actual',
      children: loadingStock ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          dataSource={stock.map((s, i) => ({ ...s, key: i }))}
          columns={stockColumns}
          size="middle"
          pagination={{ pageSize: 20, showSizeChanger: true }}
          locale={{ emptyText: 'Sin registros de stock' }}
          scroll={{ x: true }}
        />
      ),
    },
    {
      key: 'movements',
      label: 'Movimientos',
      children: loadingMovements ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          dataSource={movements.map((m) => ({ ...m, key: m.id }))}
          columns={movementColumns}
          size="middle"
          pagination={{ pageSize: 20, showSizeChanger: true }}
          locale={{ emptyText: 'Sin movimientos registrados' }}
          scroll={{ x: true }}
        />
      ),
    },
  ]

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
          Inventario
        </Title>
        <Space>
          <Button
            icon={React.createElement(ArrowDownOutlined)}
            onClick={() => openModal('entry')}
            style={{ borderColor: '#52c41a', color: '#52c41a' }}
          >
            Entrada
          </Button>
          <Button
            icon={React.createElement(ArrowUpOutlined)}
            onClick={() => openModal('exit')}
            danger
          >
            Salida
          </Button>
          <Button
            icon={React.createElement(SwapOutlined)}
            onClick={() => openModal('transfer')}
            type="default"
          >
            Traslado
          </Button>
        </Space>
      </div>

      {error && (
        <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} />

      <Modal
        title={modalType ? modalTitles[modalType] : ''}
        open={modalType !== null}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="middle" style={{ marginTop: 16 }}>
          {renderMovementForm()}
        </Form>
      </Modal>
    </div>
  )
}
