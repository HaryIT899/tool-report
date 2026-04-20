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
  Badge,
  Tabs,
  InputNumber,
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
  PauseCircleOutlined,
  PlayCircleOutlined,
  ClearOutlined,
  ApiOutlined,
  FileTextOutlined,
  EditOutlined,
} from '@ant-design/icons';
import {
  accountsApi,
  domainsApi,
  proxiesApi,
  reportLogsApi,
  reportServicesApi,
  reportsApi,
  templatesApi,
} from '../api';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Dashboard = () => {
  const [domains, setDomains] = useState([]);
  const [reportServices, setReportServices] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [proxies, setProxies] = useState([]);
  const [reportLogs, setReportLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [proxyModalVisible, setProxyModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [logsDrawerVisible, setLogsDrawerVisible] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [clientReportDrawerVisible, setClientReportDrawerVisible] = useState(false);
  const [clientReportDomain, setClientReportDomain] = useState(null);
  const [clientReportEmail, setClientReportEmail] = useState('');
  const [clientReportName, setClientReportName] = useState('');
  const [selectedProxyId, setSelectedProxyId] = useState(null);
  const [clientReportCompany, setClientReportCompany] = useState('');
  const [clientReportTitle, setClientReportTitle] = useState('');
  const [clientReportPhone, setClientReportPhone] = useState('');
  const [clientReportSignature, setClientReportSignature] = useState('');
  const [clientReportAuthorizedUrl, setClientReportAuthorizedUrl] = useState('');
  const [clientReportInfringingUrls, setClientReportInfringingUrls] = useState('');
  const [clientReportWorkDescription, setClientReportWorkDescription] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [queueStats, setQueueStats] = useState({});
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [proxyForm] = Form.useForm();
  const [templateForm] = Form.useForm();
  const [accountForm] = Form.useForm();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  // Use empty string for relative paths - proxied through Vite
  const backendBaseUrl = '';

  useEffect(() => {
    fetchDomains();
    fetchReportServices();
    fetchTemplates();
    fetchAccounts();
    fetchProxies();
    fetchStats();
    fetchQueueStats();

    const interval = setInterval(() => {
      fetchQueueStats();
      fetchStats();
      fetchProxies();
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

  useEffect(() => {
    if (clientReportDrawerVisible) {
      setClientReportEmail(localStorage.getItem('reporterEmail') || '');
      setClientReportName(localStorage.getItem('reporterName') || '');
      setClientReportCompany(localStorage.getItem('reporterCompany') || '');
      setClientReportTitle(localStorage.getItem('reporterTitle') || '');
      setClientReportPhone(localStorage.getItem('reporterPhone') || '');
      setClientReportSignature(localStorage.getItem('reporterSignature') || '');
      setClientReportAuthorizedUrl(localStorage.getItem('reporterAuthorizedUrl') || '');
      setClientReportInfringingUrls(localStorage.getItem('reporterInfringingUrls') || '');
      setClientReportWorkDescription(localStorage.getItem('reporterWorkDescription') || '');
    }
  }, [clientReportDrawerVisible]);

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

  const fetchProxies = async () => {
    try {
      const data = await proxiesApi.list();
      setProxies(data);
    } catch (error) {
      console.error('Failed to fetch proxies');
    }
  };

  const handleCreateAccount = async () => {
    try {
      const values = await accountForm.validateFields();
      await accountsApi.create(values);
      message.success('Account created');
      setAccountModalVisible(false);
      accountForm.resetFields();
      fetchAccounts();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.response?.data?.message || 'Failed to create account');
    }
  };

  const handleDeleteAccount = async (id) => {
    try {
      await accountsApi.remove(id);
      message.success('Deleted');
      fetchAccounts();
    } catch {
      message.error('Failed to delete account');
    }
  };

  const handleUpdateAccountStatus = async (id, status) => {
    try {
      await accountsApi.update(id, { status });
      message.success('Updated');
      fetchAccounts();
    } catch {
      message.error('Failed to update');
    }
  };

  const handlePrepareAccountSession = async (id) => {
    try {
      const data = await accountsApi.prepareSession(id);
      if (data.ok) {
        message.success('Login success');
      } else {
        message.warning(
          `Login not ready (${data.status || 'UNKNOWN'})${data.reason ? `: ${data.reason}` : ''}`,
        );
      }
      fetchAccounts();
    } catch (e) {
      message.error(e.response?.data?.message || 'Failed to prepare session');
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
        values.reason =
          template?.description
            ?.replaceAll('{{domain}}', values.domain)
            ?.replaceAll('{domain}', values.domain) || values.reason;
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

  const openCreateTemplateModal = () => {
    setEditingTemplate(null);
    templateForm.resetFields();
    setTemplateModalVisible(true);
  };

  const openEditTemplateModal = (template) => {
    setEditingTemplate(template);
    templateForm.setFieldsValue({
      key: template.id,
      name: template.name,
      description: template.description,
    });
    setTemplateModalVisible(true);
  };

  const handleSaveTemplate = async (values) => {
    try {
      if (editingTemplate) {
        await templatesApi.update(editingTemplate.id, {
          name: values.name,
          description: values.description,
        });
        message.success('Template updated successfully');
      } else {
        await templatesApi.create(values);
        message.success('Template created successfully');
      }
      setTemplateModalVisible(false);
      setEditingTemplate(null);
      templateForm.resetFields();
      fetchTemplates();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await templatesApi.remove(id);
      message.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to delete template');
    }
  };

  const handleAddProxy = async (values) => {
    try {
      await proxiesApi.create(values);
      message.success('Proxy added successfully');
      setProxyModalVisible(false);
      proxyForm.resetFields();
      fetchProxies();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to add proxy');
    }
  };

  const handleDeleteProxy = async (id) => {
    try {
      await proxiesApi.remove(id);
      message.success('Proxy deleted successfully');
      fetchProxies();
    } catch (error) {
      message.error('Failed to delete proxy');
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

  const openReportTabAndAutofill = (reportUrl, payload) => {
    const encodePayload = (obj) => {
      const json = JSON.stringify(obj || {});
      const utf8 = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16)),
      );
      const b64 = btoa(utf8);
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    };

    const encoded = encodePayload(payload);

    let urlToOpen = reportUrl;
    try {
      const u = new URL(reportUrl);
      const params = new URLSearchParams(String(u.hash || '').replace(/^#/, ''));
      params.set('dar', encoded);
      u.hash = params.toString();
      urlToOpen = u.toString();
    } catch (e) {
      void e;
    }

    const tab = window.open(urlToOpen, `dar_${encoded}`);
    if (!tab) {
      message.error('Popup bị chặn. Hãy cho phép popups cho trang này rồi thử lại.');
      return;
    }

    const msg = { type: 'FILL_REPORT_FORM', payload };
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      try {
        tab.postMessage(msg, '*');
      } catch (e) {
        void e;
      }
      if (tries >= 25) clearInterval(timer);
    }, 600);
  };

  const openWithPuppeteer = async (serviceId) => {
    if (!clientReportDomain) return;
    try {
      message.loading({ content: 'Opening browser with account profile...', key: 'puppeteer', duration: 0 });
      const payload = {};
      if (selectedProxyId) {
        payload.proxyId = selectedProxyId;
        console.log('Sending proxyId:', selectedProxyId);
      } else {
        console.log('No proxy selected');
      }
      const result = await reportsApi.runPuppeteerTool(clientReportDomain._id, serviceId, payload);
      message.destroy('puppeteer');
      if (result.ok) {
        const accountInfo = result.account?.email || 'default';
        let msg = `Browser opened with account: ${accountInfo}`;
        if (result.proxy) {
          msg += `\n🌐 Proxy: ${result.proxy.host}:${result.proxy.port}`;
        } else {
          msg += '\n🌐 Proxy: Direct connection (no proxy)';
        }
        message.success(msg, 5);
      } else {
        message.error(result.error || 'Failed to open browser');
      }
    } catch (error) {
      message.destroy('puppeteer');
      message.error('Failed to open browser with Puppeteer');
      console.error(error);
    }
  };

  const buildAutofillPayload = (reportUrl) => {
    const cleanDomain = String(clientReportDomain?.domain || '').trim();
    const host = cleanDomain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    const isGoogleSpam = String(reportUrl || '').includes('search.google.com/search-console/report-spam');
    const isSafeBrowsing = String(reportUrl || '').includes('safebrowsing.google.com/safebrowsing/report_phish');

    return {
      domain: cleanDomain,
      reason: clientReportDomain?.reason || '',
      email: clientReportEmail,
      name: clientReportName,
      company: clientReportCompany,
      title: clientReportTitle,
      phone: clientReportPhone,
      signature: clientReportSignature,
      authorizedUrl: clientReportAuthorizedUrl || `https://${host}`,
      infringingUrls: clientReportInfringingUrls || `https://${host}`,
      workDescription: clientReportWorkDescription || clientReportDomain?.reason || '',
      firstName: String(clientReportName || '').split(' ').slice(0, 1).join(' ').trim(),
      lastName: String(clientReportName || '').split(' ').slice(1).join(' ').trim(),
      queryPhrase: host,
      urlToReport: `https://${host}`,
      safeBrowsingThreatType: 'Tấn công phi kỹ thuật',
      safeBrowsingThreatCategory: 'Lừa đảo qua mạng xã hội',
      autoSubmit: isGoogleSpam || isSafeBrowsing,
    };
  };

  const handleReportDomain = async (domainRecord) => {
    try {
      if (!reportServices.length) {
        message.error('No report services available');
        return;
      }
      setClientReportDomain(domainRecord);
      
      // Load saved proxy selection
      const savedProxyId = localStorage.getItem('selectedProxyId');
      if (savedProxyId) {
        // Check if proxy still exists and is active
        const proxyExists = proxies.find(p => p._id === savedProxyId && p.status === 'active');
        if (proxyExists) {
          setSelectedProxyId(savedProxyId);
        } else {
          localStorage.removeItem('selectedProxyId');
          setSelectedProxyId(null);
        }
      }
      
      setClientReportDrawerVisible(true);
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to queue reports');
    }
  };

  const handleResetDomain = async (domain) => {
    try {
      const data = await reportsApi.resetDomain(domain._id);
      message.success(
        `Reset xong. Logs=${data.deletedLogs || 0}, JobsRemoved=${data.removedJobs || 0}, JobsNotRemoved=${data.notRemovedJobs || 0}`,
      );
      if (selectedDomain?._id === domain._id) {
        setReportLogs([]);
        fetchDomainLogs(domain._id);
      }
      fetchDomains();
      fetchQueueStats();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to reset domain');
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

  const handlePauseQueue = async () => {
    try {
      const data = await reportsApi.pauseQueue();
      message.success(data.message);
      fetchQueueStats();
    } catch (error) {
      message.error('Failed to pause queue');
    }
  };

  const handleResumeQueue = async () => {
    try {
      const data = await reportsApi.resumeQueue();
      message.success(data.message);
      fetchQueueStats();
    } catch (error) {
      message.error('Failed to resume queue');
    }
  };

  const handleCleanQueue = async () => {
    try {
      const data = await reportsApi.cleanQueue();
      message.success(data.message);
      fetchQueueStats();
    } catch (error) {
      message.error('Failed to clean queue');
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
      ACTIVE: 'green',
      NEED_RELOGIN: 'orange',
      INVALID: 'gray',
      LOCKED: 'red',
    };
    const key = typeof status === 'string' ? status : '';
    return colors[key] || colors[key.toUpperCase()] || 'default';
  };

  const domainColumns = [
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
            onClick={() => handleReportDomain(record)}
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
            title="Reset domain này? Sẽ xoá logs và đưa status về PENDING."
            onConfirm={() => handleResetDomain(record)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" icon={<ClearOutlined />}>
              Reset
            </Button>
          </Popconfirm>
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

  const proxyColumns = [
    {
      title: 'Host',
      dataIndex: 'host',
      key: 'host',
    },
    {
      title: 'Port',
      dataIndex: 'port',
      key: 'port',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => <Tag>{type.toUpperCase()}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge 
          status={status === 'active' ? 'success' : status === 'banned' ? 'error' : 'default'}
          text={status.toUpperCase()}
        />
      ),
    },
    {
      title: 'Usage',
      dataIndex: 'useCount',
      key: 'useCount',
      render: (count, record) => (
        <Text>
          {count} <Text type="secondary">({record.failCount} fails)</Text>
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm
          title="Delete this proxy?"
          onConfirm={() => handleDeleteProxy(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button size="small" danger icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const templateColumns = [
    {
      title: 'Key',
      dataIndex: 'id',
      key: 'id',
      width: '18%',
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '22%',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditTemplateModal(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this template?"
            onConfirm={() => handleDeleteTemplate(record.id)}
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
          <DashboardOutlined /> Domain Abuse Reporter Pro
        </Title>
        <Space>
          <Text style={{ color: '#fff' }}>Welcome, <strong>{user.username}</strong></Text>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            Logout
          </Button>
        </Space>
      </Header>
      
      <Layout>
        <Sider width={280} style={{ background: '#fff', padding: '16px' }}>
          <Card title="Statistics" size="small" style={{ marginBottom: 16 }}>
            <Statistic title="Total Reports" value={stats.total || 0} />
            <Statistic title="Success" value={stats.success || 0} valueStyle={{ color: '#3f8600' }} />
            <Statistic title="Failed" value={stats.failed || 0} valueStyle={{ color: '#cf1322' }} />
          </Card>

          <Card title="Queue Control" size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Status:</Text>
                <Tag color={queueStats.isPaused ? 'red' : 'green'}>
                  {queueStats.isPaused ? 'PAUSED' : 'RUNNING'}
                </Tag>
              </div>
              <Text>Active: <strong>{queueStats.active || 0}</strong></Text>
              <Text>Waiting: <strong>{queueStats.waiting || 0}</strong></Text>
              <Text>Completed: <strong>{queueStats.completed || 0}</strong></Text>
              <Text>Failed: <strong>{queueStats.failed || 0}</strong></Text>
              
              <Space style={{ width: '100%' }}>
                {queueStats.isPaused ? (
                  <Button 
                    size="small" 
                    icon={<PlayCircleOutlined />}
                    onClick={handleResumeQueue}
                    type="primary"
                    block
                  >
                    Resume
                  </Button>
                ) : (
                  <Button 
                    size="small" 
                    icon={<PauseCircleOutlined />}
                    onClick={handlePauseQueue}
                    danger
                    block
                  >
                    Pause
                  </Button>
                )}
                <Button 
                  size="small" 
                  icon={<ClearOutlined />}
                  onClick={handleCleanQueue}
                >
                  Clean
                </Button>
              </Space>
            </Space>
          </Card>

          <Card title="Proxy Status" size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Active:</Text>
                <Text strong style={{ color: '#3f8600' }}>
                  {proxies.filter((p) => p.status === 'active').length}
                </Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Banned:</Text>
                <Text strong style={{ color: '#cf1322' }}>
                  {proxies.filter((p) => p.status === 'banned').length}
                </Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Total:</Text>
                <Text strong>{proxies.length}</Text>
              </div>
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
          <Tabs
            defaultActiveKey="domains"
            items={[
              {
                key: 'domains',
                label: 'Domain Management',
                children: (
                  <Card>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Title level={4} style={{ margin: 0 }}>Domains</Title>
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
                          disabled={queueStats.isPaused}
                        >
                          Report All Pending (Ctrl+Enter)
                        </Button>
                      </Space>
                    </div>
                    
                    <Table
                      columns={domainColumns}
                      dataSource={domains}
                      rowKey="_id"
                      loading={loading}
                      pagination={{ pageSize: 10 }}
                      rowClassName={(record) => record.status === 'processing' ? 'row-processing' : ''}
                    />
                  </Card>
                ),
              },
              {
                key: 'proxies',
                label: (
                  <span>
                    <ApiOutlined /> Proxy Management
                  </span>
                ),
                children: (
                  <Card>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Title level={4} style={{ margin: 0 }}>Proxies</Title>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setProxyModalVisible(true)}
                      >
                        Add Proxy
                      </Button>
                    </div>
                    
                    <Table
                      columns={proxyColumns}
                      dataSource={proxies}
                      rowKey="_id"
                      pagination={{ pageSize: 15 }}
                    />
                  </Card>
                ),
              },
              {
                key: 'templates',
                label: (
                  <span>
                    <FileTextOutlined /> Templates
                  </span>
                ),
                children: (
                  <Card>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Title level={4} style={{ margin: 0 }}>Templates</Title>
                      <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTemplateModal}>
                        Add Template
                      </Button>
                    </div>
                    <Table columns={templateColumns} dataSource={templates} rowKey="id" pagination={{ pageSize: 15 }} />
                  </Card>
                ),
              },
              {
                key: 'accounts',
                label: 'Accounts',
                children: (
                  <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <Title level={4} style={{ margin: 0 }}>Gmail Accounts</Title>
                      <Button type="primary" onClick={() => setAccountModalVisible(true)}>
                        Add Account
                      </Button>
                    </div>
                    <Table
                      rowKey="_id"
                      dataSource={accounts}
                      columns={[
                        { title: 'Email', dataIndex: 'email' },
                        { title: 'Provider', dataIndex: 'provider', render: (v) => v || 'google' },
                        { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={getStatusColor(v)}>{v}</Tag> },
                        { title: 'Last Used', dataIndex: 'lastUsedAt', render: (v) => (v ? new Date(v).toLocaleString() : '-') },
                        { title: 'Count', dataIndex: 'reportCount' },
                        {
                          title: 'Actions',
                          render: (_, r) => (
                            <Space>
                              <Select
                                size="small"
                                value={r.status}
                                onChange={(val) => handleUpdateAccountStatus(r._id, val)}
                                options={[
                                  { value: 'ACTIVE', label: 'ACTIVE' },
                                  { value: 'NEED_RELOGIN', label: 'NEED_RELOGIN' },
                                  { value: 'INVALID', label: 'INVALID' },
                                  { value: 'LOCKED', label: 'LOCKED' },
                                ]}
                              />
                              <Button size="small" type="primary" onClick={() => handlePrepareAccountSession(r._id)}>
                                Login
                              </Button>
                              <Popconfirm title="Delete account?" onConfirm={() => handleDeleteAccount(r._id)}>
                                <Button size="small" danger>Delete</Button>
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                      pagination={{ pageSize: 10 }}
                    />
                  </Card>
                ),
              },
            ]}
          />
        </Content>
      </Layout>

      <Modal
        title="Add Gmail Account"
        open={accountModalVisible}
        onCancel={() => {
          setAccountModalVisible(false);
          accountForm.resetFields();
        }}
        onOk={handleCreateAccount}
        okText="Create"
      >
        <Form layout="vertical" form={accountForm}>
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Email is required' }]}>
            <Input placeholder="name@gmail.com" />
          </Form.Item>
          <Form.Item name="password" label="Password (Optional)">
            <Input.Password />
          </Form.Item>
          <Form.Item name="provider" initialValue="google" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

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
        <Form form={form} layout="vertical" onFinish={handleAddDomain}>
          <Form.Item
            name="domain"
            label="Domain"
            rules={[{ required: true, message: 'Please input domain name!' }]}
          >
            <Input placeholder="example.com" />
          </Form.Item>

          <Form.Item name="template" label="Template (Optional)">
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
        <Form form={bulkForm} layout="vertical" onFinish={handleBulkImport}>
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

          <Form.Item name="template" label="Template (Optional)">
            <Select placeholder="Select a template" allowClear>
              {templates.map((t) => (
                <Option key={t.id} value={t.id}>{t.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="reason" label="Reason (Optional - will use template if selected)">
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

      <Modal
        title="Add New Proxy"
        open={proxyModalVisible}
        onCancel={() => {
          setProxyModalVisible(false);
          proxyForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form form={proxyForm} layout="vertical" onFinish={handleAddProxy}>
          <Form.Item
            name="host"
            label="Host"
            rules={[{ required: true, message: 'Please input proxy host!' }]}
          >
            <Input placeholder="185.199.229.156" />
          </Form.Item>

          <Form.Item
            name="port"
            label="Port"
            rules={[{ required: true, message: 'Please input proxy port!' }]}
          >
            <InputNumber placeholder="8080" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="type" label="Type" initialValue="http">
            <Select>
              <Option value="http">HTTP</Option>
              <Option value="https">HTTPS</Option>
              <Option value="socks4">SOCKS4</Option>
              <Option value="socks5">SOCKS5</Option>
            </Select>
          </Form.Item>

          <Form.Item name="username" label="Username (Optional)">
            <Input placeholder="proxyuser" />
          </Form.Item>

          <Form.Item name="password" label="Password (Optional)">
            <Input.Password placeholder="proxypass" />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setProxyModalVisible(false);
                proxyForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Add Proxy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingTemplate ? 'Edit Template' : 'Add Template'}
        open={templateModalVisible}
        onCancel={() => {
          setTemplateModalVisible(false);
          setEditingTemplate(null);
          templateForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form form={templateForm} layout="vertical" onFinish={handleSaveTemplate}>
          {!editingTemplate && (
            <Form.Item name="key" label="Key (Optional)">
              <Input placeholder="abuse-generic" />
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please input template name!' }]}
          >
            <Input placeholder="Generic Abuse Report" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please input template description!' }]}
          >
            <TextArea rows={8} placeholder="Write the report reason/content. Use {domain} or {{domain}} placeholders." />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setTemplateModalVisible(false);
                  setEditingTemplate(null);
                  templateForm.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingTemplate ? 'Save' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`Client Report - ${clientReportDomain?.domain || ''}`}
        placement="right"
        onClose={() => setClientReportDrawerVisible(false)}
        open={clientReportDrawerVisible}
        width={700}
      >
        {!clientReportDomain ? (
          <Empty description="Chọn domain để report." />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Card size="small" title="Thông tin autofill">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>Domain:</Text> <Text>{clientReportDomain.domain}</Text>
                </div>
                <div>
                  <Text strong>Reason:</Text>
                  <div style={{ marginTop: 6 }}>
                    <TextArea value={clientReportDomain.reason || ''} rows={4} readOnly />
                  </div>
                </div>
                <div>
                  <Text strong>Email (optional):</Text>
                  <div style={{ marginTop: 6 }}>
                    <Input
                      value={clientReportEmail}
                      placeholder="Email để extension autofill (nếu form có field email)"
                      onChange={(e) => {
                        const v = e.target.value;
                        setClientReportEmail(v);
                        localStorage.setItem('reporterEmail', v);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Text strong>Name (optional):</Text>
                  <div style={{ marginTop: 6 }}>
                    <Input
                      value={clientReportName}
                      placeholder="Tên người report (Cloudflare/Radix/DMCA nếu cần)"
                      onChange={(e) => {
                        const v = e.target.value;
                        setClientReportName(v);
                        localStorage.setItem('reporterName', v);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Text strong>Company (optional):</Text>
                  <div style={{ marginTop: 6 }}>
                    <Input
                      value={clientReportCompany}
                      placeholder="Company (DMCA/Cloudflare nếu cần)"
                      onChange={(e) => {
                        const v = e.target.value;
                        setClientReportCompany(v);
                        localStorage.setItem('reporterCompany', v);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Text strong>Title / Role (optional):</Text>
                  <div style={{ marginTop: 6 }}>
                    <Input
                      value={clientReportTitle}
                      placeholder="Title/Role (Cloudflare nếu cần)"
                      onChange={(e) => {
                        const v = e.target.value;
                        setClientReportTitle(v);
                        localStorage.setItem('reporterTitle', v);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Text strong>Phone (optional):</Text>
                  <div style={{ marginTop: 6 }}>
                    <Input
                      value={clientReportPhone}
                      placeholder="Phone (Cloudflare nếu cần)"
                      onChange={(e) => {
                        const v = e.target.value;
                        setClientReportPhone(v);
                        localStorage.setItem('reporterPhone', v);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Text strong>Signature (optional):</Text>
                  <div style={{ marginTop: 6 }}>
                    <Input
                      value={clientReportSignature}
                      placeholder="Signature (DMCA nếu cần)"
                      onChange={(e) => {
                        const v = e.target.value;
                        setClientReportSignature(v);
                        localStorage.setItem('reporterSignature', v);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Text strong>Authorized URL (optional):</Text>
                  <div style={{ marginTop: 6 }}>
                    <Input
                      value={clientReportAuthorizedUrl}
                      placeholder="URL mẫu hợp lệ (DMCA - nếu có)"
                      onChange={(e) => {
                        const v = e.target.value;
                        setClientReportAuthorizedUrl(v);
                        localStorage.setItem('reporterAuthorizedUrl', v);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Text strong>Infringing URL(s) (optional):</Text>
                  <div style={{ marginTop: 6 }}>
                    <TextArea
                      value={clientReportInfringingUrls}
                      rows={2}
                      placeholder="Danh sách URL vi phạm (DMCA). Mỗi dòng 1 URL."
                      onChange={(e) => {
                        const v = e.target.value;
                        setClientReportInfringingUrls(v);
                        localStorage.setItem('reporterInfringingUrls', v);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Text strong>Work description (optional):</Text>
                  <div style={{ marginTop: 6 }}>
                    <TextArea
                      value={clientReportWorkDescription}
                      rows={3}
                      placeholder="Mô tả tác phẩm có bản quyền (DMCA). Để trống sẽ dùng Reason."
                      onChange={(e) => {
                        const v = e.target.value;
                        setClientReportWorkDescription(v);
                        localStorage.setItem('reporterWorkDescription', v);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Text strong>Proxy (optional - for Puppeteer only):</Text>
                  <div style={{ marginTop: 6 }}>
                    <Select
                      value={selectedProxyId}
                      placeholder="No proxy (direct connection)"
                      style={{ width: '100%' }}
                      allowClear
                      onChange={(value) => {
                        setSelectedProxyId(value);
                        if (value) {
                          localStorage.setItem('selectedProxyId', value);
                        } else {
                          localStorage.removeItem('selectedProxyId');
                        }
                      }}
                    >
                      {proxies
                        .filter((p) => p.status === 'active')
                        .map((proxy) => (
                          <Option key={proxy._id} value={proxy._id}>
                            {proxy.host}:{proxy.port} ({proxy.type}) - Used: {proxy.useCount || 0} times
                          </Option>
                        ))}
                    </Select>
                  </div>
                  {selectedProxyId && (
                    <div style={{ marginTop: 8 }}>
                      <Tag color="blue">
                        Proxy selected: {proxies.find(p => p._id === selectedProxyId)?.host}:{proxies.find(p => p._id === selectedProxyId)?.port}
                      </Tag>
                    </div>
                  )}
                </div>
                <Text type="secondary">
                  Extension: Mở tab trong browser hiện tại. Puppeteer: Mở browser riêng với account profile đã đăng nhập.
                </Text>
              </Space>
            </Card>

            <Card size="small" title="Services">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space wrap>
                  <Button
                    type="primary"
                    onClick={() => {
                      const activeServices = reportServices.filter((s) => s.active !== false);
                      if (activeServices.length === 0) {
                        message.warning('Không có service active');
                        return;
                      }
                      
                      // Bước 1: Mở tất cả tabs CÙNG LÚC (tránh popup blocker)
                      const openedTabs = [];
                      activeServices.forEach((s) => {
                        const payload = buildAutofillPayload(s.reportUrl);
                        const encodePayload = (obj) => {
                          const json = JSON.stringify(obj || {});
                          const utf8 = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
                            String.fromCharCode(parseInt(p1, 16)),
                          );
                          const b64 = btoa(utf8);
                          return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
                        };
                        
                        const encoded = encodePayload(payload);
                        let urlToOpen = s.reportUrl;
                        try {
                          const u = new URL(s.reportUrl);
                          const params = new URLSearchParams(String(u.hash || '').replace(/^#/, ''));
                          params.set('dar', encoded);
                          u.hash = params.toString();
                          urlToOpen = u.toString();
                        } catch (e) {
                          void e;
                        }
                        
                        // Unique name để không bị ghi đè
                        const uniqueName = `dar_${s._id}_${Date.now()}_${Math.random()}`;
                        const tab = window.open(urlToOpen, uniqueName);
                        if (tab) {
                          openedTabs.push({ tab, payload, service: s.name });
                        }
                      });
                      
                      if (openedTabs.length < activeServices.length) {
                        message.warning(`Chỉ mở được ${openedTabs.length}/${activeServices.length} tabs. Cho phép popups và thử lại.`);
                        return;
                      }
                      
                      message.success(`✓ Đã mở ${openedTabs.length} tabs. Extension sẽ tự fill tuần tự...`);
                      
                      // Bước 2: Gửi message TUẦN TỰ với delay để extension xử lý tốt
                      // Delay đầu tiên: chờ tabs load
                      setTimeout(() => {
                        openedTabs.forEach(({ tab, payload, service }, index) => {
                          // Delay giữa mỗi tab: 2s
                          setTimeout(() => {
                            try {
                              const msg = { type: 'FILL_REPORT_FORM', payload };
                              tab.postMessage(msg, '*');
                              console.log(`[${index + 1}/${openedTabs.length}] Sent fill message to: ${service}`);
                            } catch (e) {
                              console.error(`Failed to send message to ${service}:`, e);
                            }
                          }, index * 2000); // 2s giữa mỗi tab
                        });
                      }, 3000); // 3s chờ tabs load xong
                    }}
                  >
                    Open All Services ({reportServices.filter((s) => s.active !== false).length})
                  </Button>
                  <Button
                    onClick={() => {
                      setClientReportDrawerVisible(false);
                      setClientReportDomain(null);
                    }}
                  >
                    Close
                  </Button>
                </Space>

                <Table
                  size="small"
                  pagination={false}
                  rowKey={(r) => r._id}
                  dataSource={reportServices.filter((s) => s.active !== false)}
                  columns={[
                    {
                      title: 'Service',
                      dataIndex: 'name',
                      key: 'name',
                      render: (name) => (
                        <Space>
                          {getServiceIcon(String(name || ''))}
                          <Text>{name}</Text>
                        </Space>
                      ),
                    },
                    {
                      title: 'Open',
                      key: 'open',
                      width: 280,
                      render: (_, svc) => (
                        <Space>
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => {
                              openReportTabAndAutofill(svc.reportUrl, buildAutofillPayload(svc.reportUrl));
                            }}
                          >
                            Extension
                          </Button>
                          <Button
                            size="small"
                            type="default"
                            onClick={() => {
                              openWithPuppeteer(svc._id);
                            }}
                          >
                            Puppeteer
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Space>
            </Card>
          </Space>
        )}
      </Drawer>

      <Drawer
        title={`Report Logs - ${selectedDomain?.domain}`}
        placement="right"
        onClose={() => setLogsDrawerVisible(false)}
        open={logsDrawerVisible}
        width={700}
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
                  {log.proxyHost && (
                    <>
                      <br />
                      <Text type="secondary">
                        <ApiOutlined /> Proxy: {log.proxyHost}
                      </Text>
                    </>
                  )}
                  {log.screenshot && (
                    <>
                      <br />
                      <Text type="secondary">
                        Screenshot:{' '}
                        <a
                          href={`${backendBaseUrl}/${String(log.screenshot).replace(/^\//, '')}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      </Text>
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
