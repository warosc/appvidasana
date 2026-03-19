import React, { useState, useCallback } from 'react'
import {
  Tabs,
  Table,
  Button,
  Space,
  Typography,
  Alert,
  Spin,
  Tag,
  message,
  Row,
  Col,
  Card,
} from 'antd'
import {
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { get, downloadFile } from '../api/client'

const { Title, Text } = Typography

type ReportType = 'inventory' | 'movements' | 'waste' | 'purchases' | 'sales'

interface ColumnDef {
  title: string
  dataIndex: string
  key: string
  render?: (v: unknown) => React.ReactNode
}

interface ReportConfig {
  label: string
  endpoint: string
  columns: ColumnDef[]
}

const REPORTS: Record<ReportType, ReportConfig> = {
  inventory: {
    label: 'Inventario',
    endpoint: '/reports/inventory',
    columns: [
      { title: 'Producto', dataIndex: 'productName', key: 'productName' },
      { title: 'Bodega', dataIndex: 'warehouseName', key: 'warehouseName' },
      {
        title: 'Stock',
        dataIndex: 'stock',
        key: 'stock',
        render: (v: unknown) => Number(v).toFixed(2),
      },
      { title: 'Unidad', dataIndex: 'unit', key: 'unit' },
    ],
  },
  movements: {
    label: 'Movimientos',
    endpoint: '/reports/movements',
    columns: [
      {
        title: 'Fecha',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (v: unknown) => dayjs(String(v)).format('DD/MM/YYYY HH:mm'),
      },
      { title: 'Producto', dataIndex: 'productName', key: 'productName' },
      { title: 'Bodega', dataIndex: 'warehouseName', key: 'warehouseName' },
      {
        title: 'Tipo',
        dataIndex: 'movementType',
        key: 'movementType',
        render: (v: unknown) => <Tag>{String(v)}</Tag>,
      },
      {
        title: 'Cantidad',
        dataIndex: 'quantity',
        key: 'quantity',
        render: (v: unknown) => Number(v).toFixed(2),
      },
      { title: 'Unidad', dataIndex: 'unit', key: 'unit' },
    ],
  },
  waste: {
    label: 'Mermas',
    endpoint: '/reports/waste',
    columns: [
      {
        title: 'Fecha',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (v: unknown) => dayjs(String(v)).format('DD/MM/YYYY HH:mm'),
      },
      { title: 'Producto', dataIndex: 'productName', key: 'productName' },
      { title: 'Bodega', dataIndex: 'warehouseName', key: 'warehouseName' },
      {
        title: 'Cantidad',
        dataIndex: 'quantity',
        key: 'quantity',
        render: (v: unknown) => Number(v).toFixed(2),
      },
      { title: 'Razón', dataIndex: 'reason', key: 'reason' },
    ],
  },
  purchases: {
    label: 'Compras',
    endpoint: '/reports/purchases',
    columns: [
      {
        title: 'Fecha',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (v: unknown) => dayjs(String(v)).format('DD/MM/YYYY HH:mm'),
      },
      { title: 'Proveedor', dataIndex: 'supplierName', key: 'supplierName' },
      {
        title: 'Estado',
        dataIndex: 'status',
        key: 'status',
        render: (v: unknown) => <Tag>{String(v)}</Tag>,
      },
    ],
  },
  sales: {
    label: 'Ventas',
    endpoint: '/reports/sales',
    columns: [
      {
        title: 'Fecha',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (v: unknown) => dayjs(String(v)).format('DD/MM/YYYY HH:mm'),
      },
      { title: 'Cliente', dataIndex: 'customerName', key: 'customerName' },
      {
        title: 'Estado',
        dataIndex: 'status',
        key: 'status',
        render: (v: unknown) => <Tag>{String(v)}</Tag>,
      },
    ],
  },
}

interface ReportTabProps {
  type: ReportType
  config: ReportConfig
}

function ReportTab({ type, config }: ReportTabProps) {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [messageApi, contextHolder] = message.useMessage()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await get<Record<string, unknown>[]>(config.endpoint)
      setData(result)
      setLoaded(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar reporte')
    } finally {
      setLoading(false)
    }
  }, [config.endpoint])

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setExporting(format)
    try {
      const ext = format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv'
      await downloadFile(
        `/reports/export?type=${type}&format=${format}`,
        `frutinve-${type}-${dayjs().format('YYYYMMDD')}.${ext}`
      )
    } catch (err: unknown) {
      messageApi.error(err instanceof Error ? err.message : 'Error al exportar')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div>
      {contextHolder}
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Text strong>Reporte de {config.label}</Text>
              {loaded && (
                <Text type="secondary">({data.length} registros)</Text>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={React.createElement(ReloadOutlined)}
                onClick={fetchData}
                loading={loading}
              >
                {loaded ? 'Actualizar' : 'Cargar Datos'}
              </Button>
              <Button
                icon={React.createElement(FileTextOutlined)}
                onClick={() => handleExport('csv')}
                loading={exporting === 'csv'}
                disabled={!loaded}
              >
                CSV
              </Button>
              <Button
                icon={React.createElement(FileExcelOutlined)}
                onClick={() => handleExport('xlsx')}
                loading={exporting === 'xlsx'}
                disabled={!loaded}
                style={{ color: '#52c41a', borderColor: '#52c41a' }}
              >
                Excel
              </Button>
              <Button
                icon={React.createElement(FilePdfOutlined)}
                onClick={() => handleExport('pdf')}
                loading={exporting === 'pdf'}
                disabled={!loaded}
                danger
              >
                PDF
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {error && (
        <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      {!loaded ? (
        <div
          style={{
            textAlign: 'center',
            padding: 60,
            color: '#bbb',
            border: '1px dashed #d9d9d9',
            borderRadius: 8,
          }}
        >
          <Text type="secondary">
            Haz clic en "Cargar Datos" para ver el reporte de {config.label}
          </Text>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          dataSource={data.map((row, i) => ({ ...row, key: (row['id'] as string) || i }))}
          columns={config.columns}
          size="small"
          pagination={{ pageSize: 25, showSizeChanger: true }}
          locale={{ emptyText: 'Sin datos para mostrar' }}
          scroll={{ x: true }}
        />
      )}
    </div>
  )
}

export default function ReportsPage() {
  const tabItems = (Object.entries(REPORTS) as [ReportType, ReportConfig][]).map(
    ([type, config]) => ({
      key: type,
      label: config.label,
      children: React.createElement(ReportTab, { type, config }),
    })
  )

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        Reportes
      </Title>
      <Tabs items={tabItems} defaultActiveKey="inventory" destroyInactiveTabPane={false} />
    </div>
  )
}
