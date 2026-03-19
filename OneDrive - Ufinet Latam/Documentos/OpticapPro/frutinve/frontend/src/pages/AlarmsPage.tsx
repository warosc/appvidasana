import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  Row,
  Col,
  Card,
  Tag,
  Typography,
  Alert,
  Spin,
  Badge,
  Space,
  Button,
  Statistic,
  Empty,
} from 'antd'
import { ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import { get } from '../api/client'

const { Title, Text } = Typography

interface LowStockItem {
  productId: number | string
  productName: string
  warehouseName: string
  stock: number
  minStock: number
  unit: string
}

interface EmptyWarehouse {
  id: number | string
  name: string
  location?: string | null
}

interface ExcessiveWasteItem {
  productId: number | string
  productName: string
  totalWaste: number
  unit: string
}

interface AlarmsResponse {
  lowStock: LowStockItem[]
  emptyWarehouses: EmptyWarehouse[]
  wasteExcessive: ExcessiveWasteItem[]
}

const REFRESH_INTERVAL = 60_000

export default function AlarmsPage() {
  const [alarms, setAlarms] = useState<AlarmsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchAlarms = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await get<AlarmsResponse>('/alarms')
      setAlarms(data)
      setLastRefresh(new Date())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar alarmas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlarms()
    intervalRef.current = setInterval(fetchAlarms, REFRESH_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchAlarms])

  const totalAlarms =
    (alarms?.lowStock.length ?? 0) +
    (alarms?.emptyWarehouses.length ?? 0) +
    (alarms?.wasteExcessive.length ?? 0)

  if (loading && !alarms) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Space align="center">
          <Title level={3} style={{ margin: 0 }}>
            Alarmas
          </Title>
          {totalAlarms > 0 && (
            <Badge count={totalAlarms} style={{ backgroundColor: '#ff4d4f' }} />
          )}
        </Space>
        <Space>
          {lastRefresh && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Actualizado: {lastRefresh.toLocaleTimeString()}
            </Text>
          )}
          <Button
            icon={React.createElement(ReloadOutlined)}
            onClick={fetchAlarms}
            loading={loading}
            size="small"
          >
            Actualizar
          </Button>
        </Space>
      </div>

      {error && (
        <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      <Row gutter={[16, 16]}>
        {/* Low Stock */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <span style={{ color: '#ff4d4f', fontSize: 18 }}>🔴</span>
                <span>Stock Bajo</span>
                <Badge
                  count={alarms?.lowStock.length ?? 0}
                  style={{ backgroundColor: alarms?.lowStock.length ? '#ff4d4f' : '#52c41a' }}
                />
              </Space>
            }
            bordered={false}
            style={{
              borderLeft: `4px solid ${alarms?.lowStock.length ? '#ff4d4f' : '#52c41a'}`,
            }}
          >
            {!alarms?.lowStock.length ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Text type="secondary">Sin productos con stock bajo</Text>
                }
              />
            ) : (
              <Row gutter={[12, 12]}>
                {alarms.lowStock.map((item, i) => (
                  <Col key={i} xs={24} sm={12} md={8} xl={6}>
                    <Card
                      size="small"
                      style={{ background: '#fff2f0', border: '1px solid #ffccc7' }}
                    >
                      <Statistic
                        title={
                          <Space direction="vertical" size={2}>
                            <Text strong>{item.productName}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {item.warehouseName}
                            </Text>
                          </Space>
                        }
                        value={Number(item.stock).toFixed(2)}
                        suffix={item.unit}
                        valueStyle={{ color: '#ff4d4f', fontSize: 18 }}
                        prefix={React.createElement(WarningOutlined)}
                      />
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Mínimo:{' '}
                          <Tag color="orange" style={{ fontSize: 11 }}>
                            {Number(item.minStock).toFixed(2)} {item.unit}
                          </Tag>
                        </Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </Col>

        {/* Empty Warehouses */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <span style={{ fontSize: 18 }}>🟡</span>
                <span>Bodegas Vacías</span>
                <Badge
                  count={alarms?.emptyWarehouses.length ?? 0}
                  style={{
                    backgroundColor: alarms?.emptyWarehouses.length ? '#faad14' : '#52c41a',
                  }}
                />
              </Space>
            }
            bordered={false}
            style={{
              borderLeft: `4px solid ${alarms?.emptyWarehouses.length ? '#faad14' : '#52c41a'}`,
            }}
          >
            {!alarms?.emptyWarehouses.length ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<Text type="secondary">Sin bodegas vacías</Text>}
              />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {alarms.emptyWarehouses.map((wh, i) => (
                  <Alert
                    key={i}
                    type="warning"
                    showIcon
                    message={<strong>{wh.name}</strong>}
                    description={wh.location || 'Sin ubicación especificada'}
                  />
                ))}
              </Space>
            )}
          </Card>
        </Col>

        {/* Excessive Waste */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <span style={{ fontSize: 18 }}>🟠</span>
                <span>Merma Excesiva (últimos 30 días)</span>
                <Badge
                  count={alarms?.wasteExcessive.length ?? 0}
                  style={{
                    backgroundColor: alarms?.wasteExcessive.length ? '#fa8c16' : '#52c41a',
                  }}
                />
              </Space>
            }
            bordered={false}
            style={{
              borderLeft: `4px solid ${alarms?.wasteExcessive.length ? '#fa8c16' : '#52c41a'}`,
            }}
          >
            {!alarms?.wasteExcessive.length ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<Text type="secondary">Sin merma excesiva</Text>}
              />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {alarms.wasteExcessive.map((item, i) => (
                  <Alert
                    key={i}
                    type="warning"
                    showIcon
                    message={<strong>{item.productName}</strong>}
                    description={
                      <span>
                        Merma total:{' '}
                        <Tag color="orange">
                          {Number(item.totalWaste).toFixed(2)} {item.unit}
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

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Las alarmas se actualizan automáticamente cada 60 segundos
        </Text>
      </div>
    </div>
  )
}
