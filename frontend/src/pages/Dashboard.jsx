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
} from 'antd';
import {
  LogoutOutlined,
  PlusOutlined,
  DeleteOutlined,
  GoogleOutlined,
  CloudOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { domainsApi, reportServicesApi } from '../api';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;

const Dashboard = () => {
  const [domains, setDomains] = useState([]);
  const [reportServices, setReportServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchDomains();
    fetchReportServices();
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

  const handleAddDomain = async (values) => {
    try {
      await domainsApi.create(values);
      message.success('Domain added successfully');
      setModalVisible(false);
      form.resetFields();
      fetchDomains();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to add domain');
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

  const handleMarkAsReported = async (id) => {
    try {
      await domainsApi.update(id, { status: 'reported' });
      message.success('Domain marked as reported');
      fetchDomains();
    } catch (error) {
      message.error('Failed to update status');
    }
  };

  const handleOpenReportUrl = (url, domainName) => {
    window.open(url, '_blank');
    message.info(`Opened report form for ${domainName}`);
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

  const columns = [
    {
      title: 'Domain',
      dataIndex: 'domain',
      key: 'domain',
      width: '25%',
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      width: '30%',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '15%',
      render: (status) => (
        <Tag color={status === 'reported' ? 'green' : 'orange'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '30%',
      render: (_, record) => (
        <Space size="small" wrap>
          {reportServices.map((service) => (
            <Button
              key={service._id}
              size="small"
              icon={getServiceIcon(service.name)}
              onClick={() => handleOpenReportUrl(service.reportUrl, record.domain)}
            >
              {service.name}
            </Button>
          ))}
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleMarkAsReported(record._id)}
            >
              Mark Reported
            </Button>
          )}
          <Popconfirm
            title="Are you sure you want to delete this domain?"
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
        background: '#fff', 
        padding: '0 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <Title level={3} style={{ margin: 0 }}>Domain Abuse Management</Title>
        <Space>
          <span>Welcome, <strong>{user.username}</strong></span>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            Logout
          </Button>
        </Space>
      </Header>
      
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Card>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>Domain List</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
              size="large"
            >
              Add Domain
            </Button>
          </div>
          
          <Table
            columns={columns}
            dataSource={domains}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Content>

      <Modal
        title="Add New Domain"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
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
    </Layout>
  );
};

export default Dashboard;
