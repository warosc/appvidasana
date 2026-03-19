import React, { useEffect, useState } from 'react'
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Alert,
  Spin,
  Typography,
  Space,
  Badge,
} from 'antd'
import {
  ShoppingOutlined,
  BankOutlined,
  AlertOutlined,
  StockOutlined,
} from '@ant-design/icons'
import { get } from '../api/client'

const { Title, Text } = Typography

interface Product {
  id: number | string
  name: string
  code: string
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

interface LowStockItem {
  productId: number | string
  productName: string
  warehouseName: string
  stock: number
  minStock: number
  unit: string
}

interface AlarmsResponse {
  lowStock: LowStockItem[]
  emptyWarehouses: { id: number | string; name: string }[]
  wasteExcessive: unknown[]
}

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [stock, setStock] = useState<StockItem[]>([])
  const [alarms, setAlarms] = useState<AlarmsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        const [prods, whs, stk, alm] = await Promise.all([
          get<Product[]>('/products'),
          get<Warehouse[]>('/warehouses'),
          get<StockItem[]>('/inventory/stock'),
          get<AlarmsResponse>('/alarms'),
        ])
        setProducts(prods)
        setWarehouses(whs)
        setStock(stk)
        setAlarms(alm)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const totalAlarms =
    (alarms?.lowStock.length ?? 0) +
    (alarms?.emptyWarehouses.length ?? 0) +
    (alarms?.wasteExcessive.length ?? 0)

  const totalStock = stock.reduce((sum, s) => sum + (Number(s.stock) || 0), 0)

  const stockColumns = [
    {
      title: 'Producto',
      dataIndex: 'productName',
      key: 'productName',
    },
    {
      title: 'Bodega',
      dataIndex: 'warehouseName',
      key: 'warehouseName',
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
      render: (v: number, row: StockItem) => (
        <Text strong>
          {Number(v).toFixed(2)} {row.unit}
        </Text>
      ),
    },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Cargando dashboard...</Text>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        message="Error al cargar el dashboard"
        description={error}
        type="error"
        showIcon
      />
    )
  }

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        Dashboard
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} xl={6}>
          <Card bordered={false} style={{ background: '#f6ffed', borderLeft: '4px solid #52c41a' }}>
            <Statistic
              title="Total Productos"
              value={products.length}
              prefix={React.createElement(ShoppingOutlined, { style: { color: '#52c41a' } })}
              valueStyle={{ color: '#52c41a' }}
            />
            <Text type="secondary">{products.filter((p) => p.isActive).length} activos</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card bordered={false} style={{ background: '#e6f4ff', borderLeft: '4px solid #1677ff' }}>
            <Statistic
              title="Total Bodegas"
              value={warehouses.length}
              prefix={React.createElement(BankOutlined, { style: { color: '#1677ff' } })}
              valueStyle={{ color: '#1677ff' }}
            />
            <Text type="secondary">{warehouses.filter((w) => w.isActive).length} activas</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card bordered={false} style={{ background: '#fff7e6', borderLeft: '4px solid #fa8c16' }}>
            <Statistic
              title="Stock Total"
              value={totalStock.toFixed(0)}
              suffix="uds."
              prefix={React.createElement(StockOutlined, { style: { color: '#fa8c16' } })}
              valueStyle={{ color: '#fa8c16' }}
            />
            <Text type="secondary">Suma de todos los productos</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card
            bordered={false}
            style={{
              background: totalAlarms > 0 ? '#fff2f0' : '#f6ffed',
              borderLeft: `4px solid ${totalAlarms > 0 ? '#ff4d4f' : '#52c41a'}`,
            }}
          >
            <Statistic
              title="Alarmas Activas"
              value={totalAlarms}
              prefix={React.createElement(AlertOutlined, {
                style: { color: totalAlarms > 0 ? '#ff4d4f' : '#52c41a' },
              })}
              valueStyle={{ color: totalAlarms > 0 ? '#ff4d4f' : '#52c41a' }}
            />
            <Text type="secondary">
              {totalAlarms > 0 ? 'Requieren atención' : 'Sin alertas pendientes'}
            </Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Stock por Producto y Bodega" bordered={false}>
            <Table
              dataSource={stock.map((s, i) => ({ ...s, key: i }))}
              columns={stockColumns}
              size="small"
              pagination={{ pageSize: 10, size: 'small' }}
              locale={{ emptyText: 'Sin registros de stock' }}
              scroll={{ x: true }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card
            title={
              <Space>
                <AlertOutlined style={{ color: '#ff4d4f' }} />
                <span>Alertas de Stock Bajo</span>
                {alarms && alarms.lowStock.length > 0 && (
                  <Badge count={alarms.lowStock.length} />
                )}
              </Space>
            }
            bordered={false}
          >
            {!alarms || alarms.lowStock.length === 0 ? (
              <Alert
                message="Sin alertas de stock bajo"
                type="success"
                showIcon
              />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {alarms.lowStock.map((item, i) => (
                  <Alert
                    key={i}
                    type="warning"
                    showIcon
                    message={
                      <span>
                        <strong>{item.productName}</strong> en {item.warehouseName}
                      </span>
                    }
                    description={
                      <span>
                        Stock:{' '}
                        <Tag color="red">
                          {Number(item.stock).toFixed(2)} {item.unit}
                        </Tag>{' '}
                        / Mínimo:{' '}
                        <Tag color="orange">
                          {Number(item.minStock).toFixed(2)} {item.unit}
                        </Tag>
                      </span>
                    }
                  />
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
