import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  message,
  Card,
  Typography,
  Popconfirm,
  Select,
  Progress,
  Drawer,
  Timeline,
  Empty,
  Statistic,
} from 'antd';
import {
  LogoutOutlined,
  PlusOutlined,
  DeleteOutlined,
  GoogleOutlined,
  CloudOutlined,
  GlobalOutlined,
  UploadOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { accountsApi, domainsApi, reportLogsApi, reportServicesApi, reportsApi, templatesApi } from '../api';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Dashboard = () => {
  const [domains, setDomains] = useState([]);
  const [reportServices, setReportServices] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [reportLogs, setReportLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [logsDrawerVisible, setLogsDrawerVisible] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [queueStats, setQueueStats] = useState({});
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchDomains();
    fetchReportServices();
    fetchTemplates();
    fetchAccounts();
    fetchStats();
    fetchQueueStats();

    const interval = setInterval(() => {
      fetchQueueStats();
      fetchStats();
    }, 5000);

    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        reportsApi
          .reportAll()
          .then((data) => {
            message.success(data.message);
            fetchDomains();
            fetchQueueStats();
          })
          .catch(() => {
            message.error('Failed to queue reports');
          });
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const data = await domainsApi.list();
      setDomains(data);
    } catch (error) {
      message.error('Failed to fetch domains');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportServices = async () => {
    try {
      const data = await reportServicesApi.list();
      setReportServices(data);
    } catch (error) {
      message.error('Failed to fetch report services');
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await templatesApi.list();
      setTemplates(data);
    } catch (error) {
      message.error('Failed to fetch templates');
    }
  };

  const fetchAccounts = async () => {
    try {
      const data = await accountsApi.list();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts');
    }
  };

  const fetchStats = async () => {
    try {
      const data = await reportLogsApi.stats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const fetchQueueStats = async () => {
    try {
      const data = await reportsApi.queueStats();
      setQueueStats(data);
    } catch (error) {
      console.error('Failed to fetch queue stats');
    }
  };

  const fetchDomainLogs = async (domainId) => {
    try {
      const data = await reportLogsApi.domainLogs(domainId);
      setReportLogs(data);
    } catch (error) {
      message.error('Failed to fetch logs');
    }
  };

  useEffect(() => {
    if (!logsDrawerVisible || !selectedDomain?._id) return undefined;

    fetchDomainLogs(selectedDomain._id);
    const interval = setInterval(() => {
      fetchDomainLogs(selectedDomain._id);
    }, 3000);

    return () => clearInterval(interval);
  }, [logsDrawerVisible, selectedDomain?._id]);

  const handleAddDomain = async (values) => {
    try {
      if (values.template) {
        const template = templates.find((t) => t.id === values.template);
        values.reason = template?.description || values.reason;
      }
      await domainsApi.create(values);
      message.success('Domain added successfully');
      setModalVisible(false);
      form.resetFields();
      fetchDomains();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to add domain');
    }
  };

  const handleBulkImport = async (values) => {
    try {
      if (values.template) {
        const template = templates.find((t) => t.id === values.template);
        values.reason = template?.description || values.reason;
      }
      const data = await domainsApi.bulkImport(values);
      message.success(data.message);
      setBulkModalVisible(false);
      bulkForm.resetFields();
      fetchDomains();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to import domains');
    }
  };

  const handleDelete = async (id) => {
    try {
      await domainsApi.remove(id);
      message.success('Domain deleted successfully');
      fetchDomains();
    } catch (error) {
      message.error('Failed to delete domain');
    }
  };

  const handleReportDomain = async (domainId) => {
    try {
      if (!reportServices.length) {
        message.error('No report services available');
        return;
      }
      const serviceIds = reportServices.map((s) => s._id);
      const data = await reportsApi.reportDomain(domainId, { serviceIds });
      if (data.jobs?.length === 0) {
        message.warning(data.message);
      } else {
        message.success(data.message);
        message.info('Đã autofill form. Vào Logs để xem screenshot và tự hoàn tất captcha + submit.');
      }
      fetchDomains();
      fetchQueueStats();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to queue reports');
    }
  };

  const handleReportAll = async () => {
    try {
      const data = await reportsApi.reportAll();
      message.success(data.message);
      fetchDomains();
      fetchQueueStats();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to queue reports');
    }
  };

  const handleOpenReportUrl = (url) => {
    window.open(url, '_blank');
  };

  const handleViewLogs = (domain) => {
    setSelectedDomain(domain);
    fetchDomainLogs(domain._id);
    setLogsDrawerVisible(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getServiceIcon = (serviceName) => {
    if (serviceName.includes('Google')) return <GoogleOutlined />;
    if (serviceName.includes('Cloudflare')) return <CloudOutlined />;
    return <GlobalOutlined />;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      processing: 'blue',
      reported: 'green',
      failed: 'red',
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'Domain',
      dataIndex: 'domain',
      key: 'domain',
      width: '20%',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      width: '25%',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Progress',
      key: 'progress',
      width: '10%',
      render: (_, record) => {
        const totalServices = reportServices.length;
        const reported = record.reportedServices?.length || 0;
        const derivedPercentage =
          totalServices > 0 ? Math.round((reported / totalServices) * 100) : 0;
        const percentage =
          typeof record.reportProgress === 'number' ? record.reportProgress : derivedPercentage;
        return <Progress percent={Math.max(0, Math.min(100, percentage))} size="small" />;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '35%',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            type="primary"
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={() => handleReportDomain(record._id)}
            disabled={record.status === 'processing'}
          >
            Report All
          </Button>
          <Button
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => handleViewLogs(record)}
          >
            Logs
          </Button>
          <Popconfirm
            title="Delete this domain?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#001529', 
        padding: '0 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
      }}>
        <Title level={3} style={{ margin: 0, color: '#fff' }}>
          <DashboardOutlined /> Domain Abuse Reporter
        </Title>
        <Space>
          <Text style={{ color: '#fff' }}>Welcome, <strong>{user.username}</strong></Text>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            Logout
          </Button>
        </Space>
      </Header>
      
      <Layout>
        <Sider width={250} style={{ background: '#fff', padding: '16px' }}>
          <Card title="Statistics" size="small" style={{ marginBottom: 16 }}>
            <Statistic title="Total Reports" value={stats.total || 0} />
            <Statistic title="Success" value={stats.success || 0} valueStyle={{ color: '#3f8600' }} />
            <Statistic title="Failed" value={stats.failed || 0} valueStyle={{ color: '#cf1322' }} />
          </Card>

          <Card title="Queue Status" size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>Active: <strong>{queueStats.active || 0}</strong></Text>
              <Text>Waiting: <strong>{queueStats.waiting || 0}</strong></Text>
              <Text>Completed: <strong>{queueStats.completed || 0}</strong></Text>
              <Text>Failed: <strong>{queueStats.failed || 0}</strong></Text>
            </Space>
          </Card>

          <Card title="Report Services" size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {reportServices.map((service) => (
                <Button
                  key={service._id}
                  size="small"
                  icon={getServiceIcon(service.name)}
                  onClick={() => handleOpenReportUrl(service.reportUrl)}
                  block
                >
                  {service.name}
                </Button>
              ))}
            </Space>
          </Card>

          <Card title="Active Accounts" size="small">
            <Text>{accounts.filter((a) => a.status === 'ACTIVE').length} / {accounts.length}</Text>
          </Card>
        </Sider>

        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <Card>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={4} style={{ margin: 0 }}>Domain Management</Title>
              <Space>
                <Button
                  type="dashed"
                  icon={<UploadOutlined />}
                  onClick={() => setBulkModalVisible(true)}
                >
                  Bulk Import
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setModalVisible(true)}
                >
                  Add Domain
                </Button>
                <Button
                  type="primary"
                  danger
                  icon={<ThunderboltOutlined />}
                  onClick={handleReportAll}
                  size="large"
                >
                  Report All Pending (Ctrl+Enter)
                </Button>
              </Space>
            </div>
            
            <Table
              columns={columns}
              dataSource={domains}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              rowClassName={(record) => record.status === 'processing' ? 'row-processing' : ''}
            />
          </Card>
        </Content>
      </Layout>

      <Modal
        title="Add New Domain"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddDomain}
        >
          <Form.Item
            name="domain"
            label="Domain"
            rules={[{ required: true, message: 'Please input domain name!' }]}
          >
            <Input placeholder="example.com" />
          </Form.Item>

          <Form.Item
            name="template"
            label="Template (Optional)"
          >
            <Select placeholder="Select a template" allowClear>
              {templates.map((t) => (
                <Option key={t.id} value={t.id}>{t.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Please input reason!' }]}
          >
            <TextArea rows={4} placeholder="Describe the abuse reason..." />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Add Domain
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Bulk Import Domains"
        open={bulkModalVisible}
        onCancel={() => {
          setBulkModalVisible(false);
          bulkForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={bulkForm}
          layout="vertical"
          onFinish={handleBulkImport}
        >
          <Form.Item
            name="domains"
            label="Domains (one per line or comma-separated)"
            rules={[{ required: true, message: 'Please input domains!' }]}
          >
            <TextArea 
              rows={8} 
              placeholder="example1.com&#10;example2.com&#10;example3.com&#10;&#10;or&#10;&#10;example1.com, example2.com, example3.com" 
            />
          </Form.Item>

          <Form.Item
            name="template"
            label="Template (Optional)"
          >
            <Select placeholder="Select a template" allowClear>
              {templates.map((t) => (
                <Option key={t.id} value={t.id}>{t.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason (Optional - will use template if selected)"
          >
            <TextArea rows={3} placeholder="Default reason for all domains..." />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setBulkModalVisible(false);
                bulkForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" icon={<UploadOutlined />}>
                Import
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`Report Logs - ${selectedDomain?.domain}`}
        placement="right"
        onClose={() => setLogsDrawerVisible(false)}
        open={logsDrawerVisible}
        width={600}
      >
        {reportLogs.length === 0 ? (
          <Empty description="Chưa có log. Bấm Report để bắt đầu." />
        ) : (
          <Timeline
            items={reportLogs.map((log) => ({
              color: log.status === 'success' ? 'green' : log.status === 'failed' ? 'red' : 'blue',
              children: (
                <div>
                  <Text strong>{log.serviceId?.name || 'Unknown Service'}</Text>
                  <br />
                  <Tag color={getStatusColor(log.status)}>{log.status}</Tag>
                  {log.stage && (
                    <>
                      <Tag style={{ marginLeft: 8 }}>{log.stage}</Tag>
                    </>
                  )}
                  {log.stageMessage && (
                    <>
                      <br />
                      <Text type="secondary">{log.stageMessage}</Text>
                    </>
                  )}
                  {Array.isArray(log.events) && log.events.length > 0 && (
                    <>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {log.events
                          .slice(-3)
                          .map((e) => `${e.stage}${e.message ? `: ${e.message}` : ''}`)
                          .join(' · ')}
                      </Text>
                    </>
                  )}
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </Text>
                  {log.email && (
                    <>
                      <br />
                      <Text type="secondary">Email: {log.email}</Text>
                    </>
                  )}
                  {log.errorMessage && (
                    <>
                      <br />
                      <Text type="danger">{log.errorMessage}</Text>
                    </>
                  )}
                </div>
              ),
            }))}
          />
        )}
      </Drawer>
    </Layout>
  );
};

export default Dashboard;
