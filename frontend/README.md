# Domain Abuse Frontend

Advanced React frontend with bulk import, real-time monitoring, and browser automation control.

## Tech Stack

- **React 18** - Modern UI library
- **Vite** - Lightning-fast build tool
- **Ant Design 5** - Enterprise UI components
- **React Router 6** - Routing
- **Axios** - HTTP client with interceptors

## Features

### 🎨 User Interface

- Modern gradient login/register pages
- Professional dashboard layout
- Responsive design
- Real-time updates
- Loading states and animations

### 📊 Dashboard Components

**Main Table:**
- Domain list with status indicators
- Progress bars showing report completion
- Quick action buttons
- Sorting and pagination

**Sidebar:**
- Real-time statistics
- Queue status monitoring
- Quick access to report services
- Active account count

**Modals:**
- Add single domain
- Bulk import domains
- Template selection

**Drawers:**
- Report logs timeline
- Detailed status history

### 🚀 Advanced Features

1. **Bulk Import**
   - Textarea input (one domain per line)
   - CSV support (comma-separated)
   - Template selection
   - Batch processing

2. **Templates**
   - Pre-defined abuse descriptions
   - Quick selection dropdown
   - Auto-fill reason field

3. **Keyboard Shortcuts**
   - **Ctrl+Enter** - Report all pending domains
   - Standard navigation shortcuts

4. **Real-Time Monitoring**
   - Auto-refresh queue stats (every 5s)
   - Auto-refresh statistics (every 5s)
   - Processing animation on rows
   - Live progress indicators

5. **Report Logs**
   - Timeline view
   - Status color coding
   - Service-specific history
   - Error message display

## Installation

```bash
npm install
```

## Configuration

API base URL is configured in `src/services/api.js`:

```javascript
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});
```

For production, update to your API domain:
```javascript
baseURL: 'https://api.yourdomain.com/api',
```

## Development

```bash
npm run dev
```

Runs on: `http://localhost:5173`

Features:
- Hot module replacement (HMR)
- Fast refresh
- Instant updates

## Building for Production

```bash
npm run build
```

Output in `dist/` folder ready to deploy.

Preview production build:
```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── PrivateRoute.jsx         # Auth guard
│   │
│   ├── pages/
│   │   ├── Login.jsx                # Login page
│   │   ├── Register.jsx             # Registration page
│   │   ├── Dashboard.jsx            # Basic dashboard (legacy)
│   │   └── DashboardAdvanced.jsx    # Advanced dashboard (current)
│   │
│   ├── services/
│   │   └── api.js                   # Axios configuration
│   │
│   ├── App.jsx                      # Routes & config
│   ├── main.jsx                     # Entry point
│   └── index.css                    # Global styles
│
├── index.html
├── vite.config.js
└── package.json
```

## Components

### PrivateRoute

Protects routes requiring authentication:
```jsx
<PrivateRoute>
  <Dashboard />
</PrivateRoute>
```

Redirects to `/login` if no token found.

### Login Page

Features:
- Username/password form
- Form validation
- Error handling
- Link to register page
- Gradient background

### Register Page

Features:
- Username, email, password fields
- Email validation
- Password strength check (min 6 chars)
- Auto-login after registration
- Link to login page

### Dashboard (Advanced)

**Layout:**
- Header with user info and logout
- Sidebar with stats and quick actions
- Main content area with domain table
- Modals for add/import
- Drawer for logs

**Statistics:**
- Total reports
- Success count
- Failed count
- Queue status (active, waiting, completed, failed)

**Domain Table Columns:**
- Domain name (bold)
- Reason (truncated)
- Status tag (color-coded)
- Progress bar
- Action buttons

**Actions:**
- Report All - Queue all services for domain
- Logs - View report history
- Delete - Remove domain

**Sidebar Actions:**
- Quick links to report services
- Open in new tab
- No auto-submission

## API Integration

### Axios Configuration

Automatic features:
- JWT token injection
- Auto-logout on 401
- Error handling
- Request/response interceptors

```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### API Calls

**Authentication:**
```javascript
await api.post('/auth/login', { username, password });
await api.post('/auth/register', { username, email, password });
```

**Domains:**
```javascript
await api.get('/domains');
await api.post('/domains', { domain, reason });
await api.post('/domains/bulk-import', { domains, reason, template });
await api.patch(`/domains/${id}`, { status });
await api.delete(`/domains/${id}`);
```

**Reports:**
```javascript
await api.post(`/reports/domain/${id}`, { serviceIds });
await api.post('/reports/all');
await api.get('/reports/queue-stats');
```

**Logs:**
```javascript
await api.get('/report-logs');
await api.get('/report-logs/stats');
await api.get(`/report-logs/domain/${id}`);
```

## Styling

### Global Styles

`index.css` includes:
- CSS reset
- Font configuration
- Processing row animation
- Pulse effect for active jobs

### Ant Design Theme

Configured in `App.jsx`:
```javascript
<ConfigProvider
  theme={{
    token: {
      colorPrimary: '#1890ff',
    },
  }}
>
```

### Custom Animations

Processing rows pulse:
```css
.row-processing {
  background-color: #e6f7ff !important;
  animation: pulse 2s ease-in-out infinite;
}
```

## State Management

Currently uses local component state with hooks:
- `useState` - Component state
- `useEffect` - Side effects and data fetching
- `useNavigate` - Routing

For larger apps, consider:
- Redux Toolkit
- Zustand
- Context API

## Performance

### Optimization Techniques

1. **Debounced API calls** for search/filter
2. **Table pagination** (10 items per page)
3. **Auto-refresh intervals** (5 seconds)
4. **Lazy loading** for heavy components
5. **Memo optimization** for expensive renders

### Bundle Size

Production build is optimized:
- Code splitting
- Tree shaking
- Minification
- Compression

Check bundle size:
```bash
npm run build
```

## Deployment

### Static Hosting

**Vercel:**
```bash
npm install -g vercel
vercel
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**AWS S3 + CloudFront:**
```bash
aws s3 sync dist/ s3://your-bucket-name
```

### Environment Variables

For production builds, update:

1. **API URL** in `src/services/api.js`
2. **CORS settings** in backend
3. **Build optimizations** in `vite.config.js`

## Browser Compatibility

Tested and supported:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Accessibility

Ant Design components include:
- ARIA labels
- Keyboard navigation
- Screen reader support
- Focus management

## Internationalization (Future)

To add i18n support:
```bash
npm install react-i18next i18next
```

## Testing (Future Enhancement)

Recommended setup:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

## Common Issues

### API calls failing

Check:
1. Backend is running on port 3000
2. CORS is configured correctly
3. Token is stored in localStorage
4. Network tab in DevTools

### Styles not loading

- Clear browser cache
- Check Ant Design CSS is imported
- Verify `index.css` is imported

### Navigation not working

- Check React Router setup
- Verify routes in `App.jsx`
- Check browser console for errors

## Development Guidelines

### Code Style

- Use functional components
- Hooks for state management
- Async/await for API calls
- Destructuring for props
- Template literals for strings

### Component Structure

```jsx
const Component = () => {
  // State
  const [data, setData] = useState([]);
  
  // Effects
  useEffect(() => {
    fetchData();
  }, []);
  
  // Handlers
  const handleAction = async () => {
    // Logic
  };
  
  // Render
  return (
    <Layout>
      {/* JSX */}
    </Layout>
  );
};
```

### Error Handling

Always wrap API calls:
```javascript
try {
  const response = await api.post('/endpoint', data);
  message.success('Success!');
} catch (error) {
  message.error(error.response?.data?.message || 'Failed');
}
```

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint JavaScript files |

## Environment Info

- **Node**: v18+
- **React**: v18.2
- **Vite**: v5.0
- **Ant Design**: v5.12

## Contributing

1. Create feature branch
2. Follow code style
3. Test thoroughly
4. Update documentation
5. Submit pull request

## License

MIT
