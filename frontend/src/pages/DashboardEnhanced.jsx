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
  SaveOutlined,
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
            message.error('Không thể tạo hàng đợi report');
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
      // Fetch user profile from backend
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`${backendBaseUrl}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
          .then(res => res.json())
          .then(profile => {
            // Use profile data if available, otherwise fallback to localStorage
            setClientReportEmail(profile.email || user.email || localStorage.getItem('reporterEmail') || '');
            setClientReportName(profile.name || localStorage.getItem('reporterName') || '');
            setClientReportCompany(profile.company || localStorage.getItem('reporterCompany') || '');
            setClientReportTitle(profile.title || localStorage.getItem('reporterTitle') || '');
            setClientReportPhone(profile.phone || localStorage.getItem('reporterPhone') || '');
            setClientReportSignature(profile.signature || localStorage.getItem('reporterSignature') || '');
            
            // Load URLs from domain if available
            if (clientReportDomain) {
              setClientReportAuthorizedUrl(clientReportDomain.authorizedUrl || '');
              setClientReportInfringingUrls(clientReportDomain.infringingUrls || '');
              setClientReportWorkDescription(clientReportDomain.workDescription || '');
            } else {
              setClientReportAuthorizedUrl(localStorage.getItem('reporterAuthorizedUrl') || '');
              setClientReportInfringingUrls(localStorage.getItem('reporterInfringingUrls') || '');
              setClientReportWorkDescription(localStorage.getItem('reporterWorkDescription') || '');
            }
          })
          .catch(err => {
            console.log('Failed to fetch profile, using localStorage', err);
            // Fallback to localStorage if API fails
            setClientReportEmail(localStorage.getItem('reporterEmail') || '');
            setClientReportName(localStorage.getItem('reporterName') || '');
            setClientReportCompany(localStorage.getItem('reporterCompany') || '');
            setClientReportTitle(localStorage.getItem('reporterTitle') || '');
            setClientReportPhone(localStorage.getItem('reporterPhone') || '');
            setClientReportSignature(localStorage.getItem('reporterSignature') || '');
            
            // Load URLs from domain if available
            if (clientReportDomain) {
              setClientReportAuthorizedUrl(clientReportDomain.authorizedUrl || '');
              setClientReportInfringingUrls(clientReportDomain.infringingUrls || '');
              setClientReportWorkDescription(clientReportDomain.workDescription || '');
            } else {
              setClientReportAuthorizedUrl(localStorage.getItem('reporterAuthorizedUrl') || '');
              setClientReportInfringingUrls(localStorage.getItem('reporterInfringingUrls') || '');
              setClientReportWorkDescription(localStorage.getItem('reporterWorkDescription') || '');
            }
          });
      } else {
        // No token, use localStorage
        setClientReportEmail(localStorage.getItem('reporterEmail') || '');
        setClientReportName(localStorage.getItem('reporterName') || '');
        setClientReportCompany(localStorage.getItem('reporterCompany') || '');
        setClientReportTitle(localStorage.getItem('reporterTitle') || '');
        setClientReportPhone(localStorage.getItem('reporterPhone') || '');
        setClientReportSignature(localStorage.getItem('reporterSignature') || '');
        
        // Load URLs from domain if available
        if (clientReportDomain) {
          setClientReportAuthorizedUrl(clientReportDomain.authorizedUrl || '');
          setClientReportInfringingUrls(clientReportDomain.infringingUrls || '');
          setClientReportWorkDescription(clientReportDomain.workDescription || '');
        } else {
          setClientReportAuthorizedUrl(localStorage.getItem('reporterAuthorizedUrl') || '');
          setClientReportInfringingUrls(localStorage.getItem('reporterInfringingUrls') || '');
          setClientReportWorkDescription(localStorage.getItem('reporterWorkDescription') || '');
        }
      }
    }
  }, [clientReportDrawerVisible]);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const data = await domainsApi.list();
      setDomains(data);
    } catch (error) {
      message.error('Không thể tải danh sách domain');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportServices = async () => {
    try {
      const data = await reportServicesApi.list();
      setReportServices(data);
    } catch (error) {
      message.error('Không thể tải danh sách dịch vụ report');
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await templatesApi.list();
      setTemplates(data);
    } catch (error) {
      message.error('Không thể tải danh sách mẫu');
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

  const updateUserProfile = async (profileData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${backendBaseUrl}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        console.log('Profile updated successfully');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const updateDomainUrls = async (domainId, urls) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${backendBaseUrl}/api/domains/${domainId}/urls`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(urls),
      });

      if (response.ok) {
        console.log('Domain URLs updated successfully');
        // Refresh domains list to get updated data
        await fetchDomains();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update domain URLs:', error);
      return false;
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
      message.error(e.response?.data?.message || 'Không thể tạo tài khoản');
    }
  };

  const handleDeleteAccount = async (id) => {
    try {
      await accountsApi.remove(id);
      message.success('Đã xóa');
      fetchAccounts();
    } catch {
      message.error('Không thể xóa tài khoản');
    }
  };

  const handleUpdateAccountStatus = async (id, status) => {
    try {
      await accountsApi.update(id, { status });
      message.success('Đã cập nhật');
      fetchAccounts();
    } catch {
      message.error('Không thể cập nhật');
    }
  };

  const handlePrepareAccountSession = async (id) => {
    try {
      const data = await accountsApi.prepareSession(id);
      if (data.ok) {
        message.success('Đăng nhập thành công');
      } else {
        message.warning(
          `Login not ready (${data.status || 'UNKNOWN'})${data.reason ? `: ${data.reason}` : ''}`,
        );
      }
      fetchAccounts();
    } catch (e) {
      message.error(e.response?.data?.message || 'Không thể chuẩn bị phiên đăng nhập');
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
      message.error('Không thể tải nhật ký');
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
      message.success('Đã thêm domain thành công');
      setModalVisible(false);
      form.resetFields();
      fetchDomains();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể thêm domain');
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
      message.error(error.response?.data?.message || 'Không thể nhập danh sách domain');
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
        message.success('Đã cập nhật mẫu thành công');
      } else {
        await templatesApi.create(values);
        message.success('Đã tạo mẫu thành công');
      }
      setTemplateModalVisible(false);
      setEditingTemplate(null);
      templateForm.resetFields();
      fetchTemplates();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể lưu mẫu');
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await templatesApi.remove(id);
      message.success('Đã xóa mẫu thành công');
      fetchTemplates();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể xóa mẫu');
    }
  };

  const handleAddProxy = async (values) => {
    try {
      await proxiesApi.create(values);
      message.success('Đã thêm proxy thành công');
      setProxyModalVisible(false);
      proxyForm.resetFields();
      fetchProxies();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể thêm proxy');
    }
  };

  const handleDeleteProxy = async (id) => {
    try {
      await proxiesApi.remove(id);
      message.success('Đã xóa proxy thành công');
      fetchProxies();
    } catch (error) {
      message.error('Không thể xóa proxy');
    }
  };

  const handleDelete = async (id) => {
    try {
      await domainsApi.remove(id);
      message.success('Đã xóa domain thành công');
      fetchDomains();
    } catch (error) {
      message.error('Không thể xóa domain');
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
        message.error(result.error || 'Không thể mở trình duyệt');
      }
    } catch (error) {
      message.destroy('puppeteer');
      message.error('Không thể mở trình duyệt với Puppeteer');
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
        message.error('Không có dịch vụ report nào khả dụng');
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
      message.error(error.response?.data?.message || 'Không thể tạo hàng đợi report');
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
      message.error(error.response?.data?.message || 'Không thể reset domain');
    }
  };

  const handleReportAll = async () => {
    try {
      const data = await reportsApi.reportAll();
      message.success(data.message);
      fetchDomains();
      fetchQueueStats();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể tạo hàng đợi report');
    }
  };

  const handlePauseQueue = async () => {
    try {
      const data = await reportsApi.pauseQueue();
      message.success(data.message);
      fetchQueueStats();
    } catch (error) {
      message.error('Không thể tạm dừng hàng đợi');
    }
  };

  const handleResumeQueue = async () => {
    try {
      const data = await reportsApi.resumeQueue();
      message.success(data.message);
      fetchQueueStats();
    } catch (error) {
      message.error('Không thể tiếp tục hàng đợi');
    }
  };

  const handleCleanQueue = async () => {
    try {
      const data = await reportsApi.cleanQueue();
      message.success(data.message);
      fetchQueueStats();
    } catch (error) {
      message.error('Không thể xóa hàng đợi');
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
      title: 'Tên miền',
      dataIndex: 'domain',
      key: 'domain',
      width: '20%',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      width: '25%',
      ellipsis: true,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      render: (status) => {
        const statusMap = {
          pending: 'CHỜ XỬ LÝ',
          processing: 'ĐANG XỬ LÝ',
          reported: 'ĐÃ REPORT',
          failed: 'THẤT BẠI',
        };
        return (
          <Tag color={getStatusColor(status)}>
            {statusMap[status] || status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Tiến độ',
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
      title: 'Thao tác',
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
            Report tất cả
          </Button>
          <Button
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => handleViewLogs(record)}
          >
            Nhật ký
          </Button>
          <Popconfirm
            title="Reset domain này? Sẽ xoá logs và đưa status về PENDING."
            onConfirm={() => handleResetDomain(record)}
            okText="Có"
            cancelText="Không"
          >
            <Button size="small" icon={<ClearOutlined />}>
              Đặt lại
            </Button>
          </Popconfirm>
          <Popconfirm
            title="Xóa domain này?"
            onConfirm={() => handleDelete(record._id)}
            okText="Có"
            cancelText="Không"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const proxyColumns = [
    {
      title: 'Máy chủ',
      dataIndex: 'host',
      key: 'host',
    },
    {
      title: 'Cổng',
      dataIndex: 'port',
      key: 'port',
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (type) => <Tag>{type.toUpperCase()}</Tag>,
    },
    {
      title: 'Trạng thái',
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
      title: 'Sử dụng',
      dataIndex: 'useCount',
      key: 'useCount',
      render: (count, record) => (
        <Text>
          {count} <Text type="secondary">({record.failCount} lỗi)</Text>
        </Text>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm
          title="Xóa proxy này?"
          onConfirm={() => handleDeleteProxy(record._id)}
          okText="Có"
          cancelText="Không"
        >
          <Button size="small" danger icon={<DeleteOutlined />}>
            Xóa
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const templateColumns = [
    {
      title: 'Mã',
      dataIndex: 'id',
      key: 'id',
      width: '18%',
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      width: '22%',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditTemplateModal(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa template này?"
            onConfirm={() => handleDeleteTemplate(record.id)}
            okText="Có"
            cancelText="Không"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Xóa
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
          <DashboardOutlined /> Hệ thống Report Domain
        </Title>
        <Space>
          <Text style={{ color: '#fff' }}>Xin chào, <strong>{user.username}</strong></Text>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            Đăng xuất
          </Button>
        </Space>
      </Header>
      
      <Layout>
        <Sider width={280} style={{ background: '#fff', padding: '16px' }}>
          <Card title="Thống kê" size="small" style={{ marginBottom: 16 }}>
            <Statistic title="Tổng số report" value={stats.total || 0} />
            <Statistic title="Thành công" value={stats.success || 0} valueStyle={{ color: '#3f8600' }} />
            <Statistic title="Thất bại" value={stats.failed || 0} valueStyle={{ color: '#cf1322' }} />
          </Card>

          <Card title="Điều khiển hàng đợi" size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Trạng thái:</Text>
                <Tag color={queueStats.isPaused ? 'red' : 'green'}>
                  {queueStats.isPaused ? 'TẠM DỪNG' : 'ĐANG CHẠY'}
                </Tag>
              </div>
              <Text>Đang chạy: <strong>{queueStats.active || 0}</strong></Text>
              <Text>Đang chờ: <strong>{queueStats.waiting || 0}</strong></Text>
              <Text>Hoàn thành: <strong>{queueStats.completed || 0}</strong></Text>
              <Text>Thất bại: <strong>{queueStats.failed || 0}</strong></Text>
              
              <Space style={{ width: '100%' }}>
                {queueStats.isPaused ? (
                  <Button 
                    size="small" 
                    icon={<PlayCircleOutlined />}
                    onClick={handleResumeQueue}
                    type="primary"
                    block
                  >
                    Tiếp tục
                  </Button>
                ) : (
                  <Button 
                    size="small" 
                    icon={<PauseCircleOutlined />}
                    onClick={handlePauseQueue}
                    danger
                    block
                  >
                    Tạm dừng
                  </Button>
                )}
                <Button 
                  size="small" 
                  icon={<ClearOutlined />}
                  onClick={handleCleanQueue}
                >
                  Xóa
                </Button>
              </Space>
            </Space>
          </Card>

          <Card title="Trạng thái Proxy" size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Hoạt động:</Text>
                <Text strong style={{ color: '#3f8600' }}>
                  {proxies.filter((p) => p.status === 'active').length}
                </Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Bị cấm:</Text>
                <Text strong style={{ color: '#cf1322' }}>
                  {proxies.filter((p) => p.status === 'banned').length}
                </Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Tổng:</Text>
                <Text strong>{proxies.length}</Text>
              </div>
            </Space>
          </Card>

          <Card title="Dịch vụ Report" size="small" style={{ marginBottom: 16 }}>
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

          <Card title="Tài khoản hoạt động" size="small">
            <Text>{accounts.filter((a) => a.status === 'ACTIVE').length} / {accounts.length}</Text>
          </Card>
        </Sider>

        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <Tabs
            defaultActiveKey="domains"
            items={[
              {
                key: 'domains',
                label: 'Quản lý Domain',
                children: (
                  <Card>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Title level={4} style={{ margin: 0 }}>Danh sách Domain</Title>
                      <Space>
                        <Button
                          type="dashed"
                          icon={<UploadOutlined />}
                          onClick={() => setBulkModalVisible(true)}
                        >
                          Nhập hàng loạt
                        </Button>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setModalVisible(true)}
                        >
                          Thêm Domain
                        </Button>
                        <Button
                          type="primary"
                          danger
                          icon={<ThunderboltOutlined />}
                          onClick={handleReportAll}
                          size="large"
                          disabled={queueStats.isPaused}
                        >
                          Report tất cả (Ctrl+Enter)
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
                    <ApiOutlined /> Quản lý Proxy
                  </span>
                ),
                children: (
                  <Card>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Title level={4} style={{ margin: 0 }}>Danh sách Proxy</Title>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setProxyModalVisible(true)}
                      >
                        Thêm Proxy
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
                    <FileTextOutlined /> Mẫu nội dung
                  </span>
                ),
                children: (
                  <Card>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Title level={4} style={{ margin: 0 }}>Mẫu nội dung</Title>
                      <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTemplateModal}>
                        Thêm mẫu
                      </Button>
                    </div>
                    <Table columns={templateColumns} dataSource={templates} rowKey="id" pagination={{ pageSize: 15 }} />
                  </Card>
                ),
              },
              {
                key: 'accounts',
                label: 'Tài khoản Gmail',
                children: (
                  <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <Title level={4} style={{ margin: 0 }}>Tài khoản Gmail</Title>
                      <Button type="primary" onClick={() => setAccountModalVisible(true)}>
                        Thêm tài khoản
                      </Button>
                    </div>
                    <Table
                      rowKey="_id"
                      dataSource={accounts}
                      columns={[
                        { title: 'Email', dataIndex: 'email' },
                        { title: 'Nhà cung cấp', dataIndex: 'provider', render: (v) => v || 'google' },
                        { title: 'Trạng thái', dataIndex: 'status', render: (v) => <Tag color={getStatusColor(v)}>{v}</Tag> },
                        { title: 'Dùng lần cuối', dataIndex: 'lastUsedAt', render: (v) => (v ? new Date(v).toLocaleString() : '-') },
                        { title: 'Số lần dùng', dataIndex: 'reportCount' },
                        {
                          title: 'Thao tác',
                          render: (_, r) => (
                            <Space>
                              <Select
                                size="small"
                                value={r.status}
                                onChange={(val) => handleUpdateAccountStatus(r._id, val)}
                                options={[
                                  { value: 'ACTIVE', label: 'HOẠT ĐỘNG' },
                                  { value: 'NEED_RELOGIN', label: 'CẦN LOGIN LẠI' },
                                  { value: 'INVALID', label: 'KHÔNG HỢP LỆ' },
                                  { value: 'LOCKED', label: 'BỊ KHÓA' },
                                ]}
                              />
                              <Button size="small" type="primary" onClick={() => handlePrepareAccountSession(r._id)}>
                                Đăng nhập
                              </Button>
                              <Popconfirm title="Xóa tài khoản?" onConfirm={() => handleDeleteAccount(r._id)} okText="Có" cancelText="Không">
                                <Button size="small" danger>Xóa</Button>
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
        title="Thêm tài khoản Gmail"
        open={accountModalVisible}
        onCancel={() => {
          setAccountModalVisible(false);
          accountForm.resetFields();
        }}
        onOk={handleCreateAccount}
        okText="Tạo"
        cancelText="Hủy"
      >
        <Form layout="vertical" form={accountForm}>
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Vui lòng nhập email' }]}>
            <Input placeholder="name@gmail.com" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu (tùy chọn)">
            <Input.Password />
          </Form.Item>
          <Form.Item name="provider" initialValue="google" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Thêm Domain mới"
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
            label="Tên miền"
            rules={[{ required: true, message: 'Vui lòng nhập tên miền!' }]}
          >
            <Input placeholder="example.com" />
          </Form.Item>

          <Form.Item name="template" label="Mẫu nội dung (tùy chọn)">
            <Select placeholder="Chọn mẫu" allowClear>
              {templates.map((t) => (
                <Option key={t.id} value={t.id}>{t.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="reason"
            label="Lý do báo cáo"
            rules={[{ required: true, message: 'Vui lòng nhập lý do!' }]}
          >
            <TextArea rows={4} placeholder="Mô tả lý do báo cáo vi phạm..." />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                Thêm Domain
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Nhập hàng loạt Domain"
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
            label="Danh sách Domain (mỗi dòng một domain hoặc phân cách bằng dấu phẩy)"
            rules={[{ required: true, message: 'Vui lòng nhập danh sách domain!' }]}
          >
            <TextArea 
              rows={8} 
              placeholder="example1.com&#10;example2.com&#10;example3.com&#10;&#10;hoặc&#10;&#10;example1.com, example2.com, example3.com" 
            />
          </Form.Item>

          <Form.Item name="template" label="Mẫu nội dung (tùy chọn)">
            <Select placeholder="Chọn mẫu" allowClear>
              {templates.map((t) => (
                <Option key={t.id} value={t.id}>{t.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="reason" label="Lý do (Tùy chọn - sẽ dùng mẫu nếu đã chọn)">
            <TextArea rows={3} placeholder="Lý do mặc định cho tất cả domain..." />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setBulkModalVisible(false);
                bulkForm.resetFields();
              }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" icon={<UploadOutlined />}>
                Nhập
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Thêm Proxy mới"
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
            label="Máy chủ"
            rules={[{ required: true, message: 'Vui lòng nhập địa chỉ proxy!' }]}
          >
            <Input placeholder="185.199.229.156" />
          </Form.Item>

          <Form.Item
            name="port"
            label="Cổng"
            rules={[{ required: true, message: 'Vui lòng nhập cổng proxy!' }]}
          >
            <InputNumber placeholder="8080" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="type" label="Loại" initialValue="http">
            <Select>
              <Option value="http">HTTP</Option>
              <Option value="https">HTTPS</Option>
              <Option value="socks4">SOCKS4</Option>
              <Option value="socks5">SOCKS5</Option>
            </Select>
          </Form.Item>

          <Form.Item name="username" label="Tên đăng nhập (tùy chọn)">
            <Input placeholder="proxyuser" />
          </Form.Item>

          <Form.Item name="password" label="Mật khẩu (tùy chọn)">
            <Input.Password placeholder="proxypass" />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setProxyModalVisible(false);
                proxyForm.resetFields();
              }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                Thêm Proxy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingTemplate ? 'Chỉnh sửa mẫu' : 'Thêm mẫu'}
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
            <Form.Item name="key" label="Mã (tùy chọn)">
              <Input placeholder="abuse-generic" />
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label="Tên mẫu"
            rules={[{ required: true, message: 'Vui lòng nhập tên mẫu!' }]}
          >
            <Input placeholder="Báo cáo vi phạm chung" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Nội dung"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung mẫu!' }]}
          >
            <TextArea rows={8} placeholder="Viết nội dung báo cáo. Sử dụng {domain} hoặc {{domain}} làm biến thay thế." />
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
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                {editingTemplate ? 'Lưu' : 'Tạo'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`Thông tin báo cáo - ${clientReportDomain?.domain || ''}`}
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
                  <Text strong>Email (tùy chọn):</Text>
                  <div style={{ marginTop: 6 }}>
                    <Input
                      value={clientReportEmail}
                      placeholder="Email để extension autofill (nếu form có field email)"
                      onChange={(e) => {
                        const v = e.target.value;
                        setClientReportEmail(v);
                        localStorage.setItem('reporterEmail', v);
                      }}
                      onBlur={() => {
                        // Note: email is already in user account, this is just for display
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Text strong>Tên người report (tùy chọn):</Text>
                  <div style={{ marginTop: 6 }}>
                    <Input
                      value={clientReportName}
                      placeholder="Tên người report (Cloudflare/Radix/DMCA nếu cần)"
                      onChange={(e) => {
                        const v = e.target.value;
                        setClientReportName(v);
                        localStorage.setItem('reporterName', v);
                      }}
                      onBlur={() => {
                        updateUserProfile({ name: clientReportName });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Text strong>Công ty (tùy chọn):</Text>
                  <div style={{ marginTop: 6 }}>
                    <Input
                      value={clientReportCompany}
                      placeholder="Công ty (DMCA/Cloudflare nếu cần)"
                      onChange={(e) => {
                        const v = e.target.value;
                        setClientReportCompany(v);
                        localStorage.setItem('reporterCompany', v);
                      }}
                      onBlur={() => {
                        updateUserProfile({ company: clientReportCompany });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Text strong>Chức vụ (tùy chọn):</Text>
                  <div style={{ marginTop: 6 }}>
                    <Input
                      value={clientReportTitle}
                      placeholder="Chức vụ (Cloudflare nếu cần)"
                      onChange={(e) => {
                        const v = e.target.value;
                        setClientReportTitle(v);
                        localStorage.setItem('reporterTitle', v);
                      }}
                      onBlur={() => {
                        updateUserProfile({ title: clientReportTitle });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Text strong>Số điện thoại (tùy chọn):</Text>
                  <div style={{ marginTop: 6 }}>
                    <Input
                      value={clientReportPhone}
                      placeholder="Số điện thoại (Cloudflare nếu cần)"
                      onChange={(e) => {
                        const v = e.target.value;
                        setClientReportPhone(v);
                        localStorage.setItem('reporterPhone', v);
                      }}
                      onBlur={() => {
                        updateUserProfile({ phone: clientReportPhone });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Text strong>Chữ ký (tùy chọn):</Text>
                  <div style={{ marginTop: 6 }}>
                    <Input
                      value={clientReportSignature}
                      placeholder="Chữ ký (DMCA nếu cần)"
                      onChange={(e) => {
                        const v = e.target.value;
                        setClientReportSignature(v);
                        localStorage.setItem('reporterSignature', v);
                      }}
                      onBlur={() => {
                        updateUserProfile({ signature: clientReportSignature });
                      }}
                    />
                  </div>
                </div>
                
                {/* Save Profile Button */}
                <div style={{ marginTop: 16, marginBottom: 8 }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => {
                      updateUserProfile({
                        name: clientReportName,
                        company: clientReportCompany,
                        phone: clientReportPhone,
                        title: clientReportTitle,
                        signature: clientReportSignature,
                      });
                      message.success('Đã lưu thông tin cá nhân!');
                    }}
                  >
                    Lưu thông tin cá nhân
                  </Button>
                  <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                    (Tự động lưu khi rời khỏi ô nhập)
                  </Text>
                </div>
                
                <div>
                  <Text strong>URL hợp lệ (tùy chọn):</Text>
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
                  <Text strong>URL vi phạm (tùy chọn):</Text>
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
                  <Text strong>Mô tả tác phẩm (tùy chọn):</Text>
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
                
                {/* Save URLs Button */}
                <div style={{ marginTop: 16, marginBottom: 8 }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={async () => {
                      if (!clientReportDomain || !clientReportDomain._id) {
                        message.warning('Chưa chọn domain');
                        return;
                      }
                      
                      const success = await updateDomainUrls(clientReportDomain._id, {
                        authorizedUrl: clientReportAuthorizedUrl,
                        infringingUrls: clientReportInfringingUrls,
                        workDescription: clientReportWorkDescription,
                      });
                      
                      if (success) {
                        message.success('Đã lưu URLs vào domain!');
                      } else {
                        message.error('Lỗi khi lưu URLs');
                      }
                    }}
                  >
                    Lưu URLs vào Domain
                  </Button>
                  <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                    (Lưu riêng cho từng domain)
                  </Text>
                </div>
                
                <div>
                  <Text strong>Proxy (tùy chọn - chỉ cho Puppeteer):</Text>
                  <div style={{ marginTop: 6 }}>
                    <Select
                      value={selectedProxyId}
                      placeholder="Không dùng proxy (kết nối trực tiếp)"
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
                            {proxy.host}:{proxy.port} ({proxy.type}) - Đã dùng: {proxy.useCount || 0} lần
                          </Option>
                        ))}
                    </Select>
                  </div>
                  {selectedProxyId && (
                    <div style={{ marginTop: 8 }}>
                      <Tag color="blue">
                        Proxy đã chọn: {proxies.find(p => p._id === selectedProxyId)?.host}:{proxies.find(p => p._id === selectedProxyId)?.port}
                      </Tag>
                    </div>
                  )}
                </div>
                <Text type="secondary">
                  Extension: Mở tab trong browser hiện tại. Puppeteer: Mở browser riêng với account profile đã đăng nhập.
                </Text>
              </Space>
            </Card>

            <Card size="small" title="Dịch vụ Report">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space wrap>
                  <Button
                    type="primary"
                    onClick={() => {
                      const activeServices = reportServices.filter((s) => s.active !== false);
                      if (activeServices.length === 0) {
                        message.warning('Không có dịch vụ nào đang hoạt động');
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
                    Mở tất cả dịch vụ ({reportServices.filter((s) => s.active !== false).length})
                  </Button>
                  <Button
                    onClick={() => {
                      setClientReportDrawerVisible(false);
                      setClientReportDomain(null);
                    }}
                  >
                    Đóng
                  </Button>
                </Space>

                <Table
                  size="small"
                  pagination={false}
                  rowKey={(r) => r._id}
                  dataSource={reportServices.filter((s) => s.active !== false)}
                  columns={[
                    {
                      title: 'Dịch vụ',
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
                      title: 'Mở',
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
        title={`Nhật ký Report - ${selectedDomain?.domain}`}
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
                  <Text strong>{log.serviceId?.name || 'Dịch vụ không xác định'}</Text>
                  <br />
                  <Tag color={getStatusColor(log.status)}>
                    {log.status === 'success' ? 'THÀNH CÔNG' : log.status === 'failed' ? 'THẤT BẠI' : log.status === 'processing' ? 'ĐANG XỬ LÝ' : log.status.toUpperCase()}
                  </Tag>
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
                    {new Date(log.createdAt).toLocaleString('vi-VN')}
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
                        Ảnh chụp:{' '}
                        <a
                          href={`${backendBaseUrl}/${String(log.screenshot).replace(/^\//, '')}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Xem
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
