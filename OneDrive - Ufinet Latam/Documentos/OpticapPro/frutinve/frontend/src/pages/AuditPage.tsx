import React, { useEffect, useState, useCallback } from 'react'
import {
  Table,
  Input,
  Select,
  Tag,
  Typography,
  Alert,
  Spin,
  Space,
  Button,
  Row,
  Col,
  Modal,
  Tooltip,
} from 'antd'
import { SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { get } from '../api/client'

const { Title, Text } = Typography

interface AuditRecord {
  id: number | string
  createdAt: string
  actor: string
  action: string
  entity: string
  entityId: string | number | null
  details: Record<string, unknown> | null
}

const ACTION_COLORS: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  login: 'purple',
  export: 'cyan',
}

export default function AuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [filtered, setFiltered] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterActor, setFilterActor] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [detailRecord, setDetailRecord] = useState<AuditRecord | null>(null)

  const fetchAudit = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await get<AuditRecord[]>('/audits?limit=500&offset=0')
      setRecords(data)
      setFiltered(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar auditoría')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAudit()
  }, [fetchAudit])

  useEffect(() => {
    let result = records
    if (filterActor.trim()) {
      result = result.filter((r) =>
        r.actor.toLowerCase().includes(filterActor.toLowerCase())
      )
    }
    if (filterAction) {
      result = result.filter((r) => r.action === filterAction)
    }
    if (filterEntity.trim()) {
      result = result.filter((r) =>
        r.entity.toLowerCase().includes(filterEntity.toLowerCase())
      )
    }
    setFiltered(result)
  }, [filterActor, filterAction, filterEntity, records])

  const clearFilters = () => {
    setFilterActor('')
    setFilterAction('')
    setFilterEntity('')
  }

  const uniqueActions = Array.from(new Set(records.map((r) => r.action))).sort()

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (v: string) => (
        <Tooltip title={dayjs(v).format('DD/MM/YYYY HH:mm:ss')}>
          <Text style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY HH:mm')}</Text>
        </Tooltip>
      ),
      sorter: (a: AuditRecord, b: AuditRecord) =>
        dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Actor',
      dataIndex: 'actor',
      key: 'actor',
      width: 120,
      render: (v: string) => (
        <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
          {v}
        </code>
      ),
    },
    {
      title: 'Acción',
      dataIndex: 'action',
      key: 'action',
      width: 110,
      render: (v: string) => (
        <Tag color={ACTION_COLORS[v] || 'default'} style={{ fontSize: 12 }}>
          {v.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Entidad',
      dataIndex: 'entity',
      key: 'entity',
      width: 130,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'ID Entidad',
      dataIndex: 'entityId',
      key: 'entityId',
      width: 90,
      render: (v: string | number | null) =>
        v != null ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {String(v)}
          </Text>
        ) : (
          '—'
        ),
    },
    {
      title: 'Detalles',
      key: 'details',
      width: 80,
      render: (_: unknown, record: AuditRecord) =>
        record.details ? (
          <Tooltip title="Ver detalles">
            <Button
              size="small"
              icon={React.createElement(EyeOutlined)}
              onClick={() => setDetailRecord(record)}
            />
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Auditoría
        </Title>
        <Button
          icon={React.createElement(ReloadOutlined)}
          onClick={fetchAudit}
          loading={loading}
        >
          Actualizar
        </Button>
      </div>

      {error && (
        <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Input
            placeholder="Filtrar por actor..."
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
            prefix={React.createElement(SearchOutlined)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={7}>
          <Select
            placeholder="Filtrar por acción"
            value={filterAction || undefined}
            onChange={(v) => setFilterAction(v || '')}
            style={{ width: '100%' }}
            allowClear
            options={uniqueActions.map((a) => ({ value: a, label: a.toUpperCase() }))}
          />
        </Col>
        <Col xs={24} sm={7}>
          <Input
            placeholder="Filtrar por entidad..."
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            prefix={React.createElement(SearchOutlined)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={2}>
          <Button onClick={clearFilters} style={{ width: '100%' }}>
            Limpiar
          </Button>
        </Col>
      </Row>

      <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
        Mostrando {filtered.length} de {records.length} registros
      </Text>

      <Table
        dataSource={filtered.map((r) => ({ ...r, key: r.id }))}
        columns={columns}
        size="small"
        pagination={{ pageSize: 25, showSizeChanger: true }}
        locale={{ emptyText: 'Sin registros de auditoría' }}
        scroll={{ x: true }}
      />

      <Modal
        title="Detalles del registro de auditoría"
        open={detailRecord !== null}
        onCancel={() => setDetailRecord(null)}
        footer={[
          <Button key="close" onClick={() => setDetailRecord(null)}>
            Cerrar
          </Button>,
        ]}
        width={600}
      >
        {detailRecord && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">Actor:</Text>
                <br />
                <Text strong>{detailRecord.actor}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Fecha:</Text>
                <br />
                <Text strong>
                  {dayjs(detailRecord.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                </Text>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">Acción:</Text>
                <br />
                <Tag color={ACTION_COLORS[detailRecord.action] || 'default'}>
                  {detailRecord.action.toUpperCase()}
                </Tag>
              </Col>
              <Col span={12}>
                <Text type="secondary">Entidad:</Text>
                <br />
                <Tag>{detailRecord.entity}</Tag>
                {detailRecord.entityId != null && (
                  <Text type="secondary"> #{detailRecord.entityId}</Text>
                )}
              </Col>
            </Row>
            {detailRecord.details && (
              <div>
                <Text type="secondary">Detalles (JSON):</Text>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 6,
                    marginTop: 8,
                    overflow: 'auto',
                    maxHeight: 300,
                    fontSize: 12,
                  }}
                >
                  {JSON.stringify(detailRecord.details, null, 2)}
                </pre>
              </div>
            )}
          </Space>
        )}
      </Modal>
    </div>
  )
}
