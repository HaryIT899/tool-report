# Domain-Specific URLs Feature

## Tổng quan
Đã thêm tính năng **lưu Authorized URL, Infringing URLs, và Work Description theo từng domain**, thay vì lưu chung vào localStorage.

Giờ **mỗi domain có thông tin riêng**, phù hợp với use case DMCA và Cloudflare Abuse.

---

## Changes Made

### 1. Backend - Domain Schema Update
**File**: `backend/src/modules/domains/schemas/domain.schema.ts`

Thêm 3 fields mới:
```typescript
@Prop()
authorizedUrl?: string;

@Prop()
infringingUrls?: string;

@Prop()
workDescription?: string;
```

### 2. Backend - Domains Service
**File**: `backend/src/modules/domains/domains.service.ts`

Thêm method `updateUrls`:
```typescript
async updateUrls(
  id: string,
  userId: string,
  urls: { 
    authorizedUrl?: string; 
    infringingUrls?: string; 
    workDescription?: string 
  },
): Promise<DomainDocument>
```

### 3. Backend - Domains Controller
**File**: `backend/src/modules/domains/domains.controller.ts`

Thêm endpoint:
```typescript
@Patch(':id/urls')
async updateUrls(@Param('id') id: string, @Body() urls, @Request() req)
```

### 4. Frontend - Dashboard Update
**File**: `frontend/src/pages/DashboardEnhanced.jsx`

#### Thêm function `updateDomainUrls`:
```javascript
const updateDomainUrls = async (domainId, urls) => {
  // Call API to save URLs to domain
  const response = await fetch(`/api/domains/${domainId}/urls`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(urls),
  });
  
  if (response.ok) {
    await fetchDomains(); // Refresh list
    return true;
  }
  return false;
}
```

#### Update `useEffect` để load URLs từ domain:
```javascript
useEffect(() => {
  if (clientReportDrawerVisible) {
    // ...load profile...
    
    // Load URLs from domain if available
    if (clientReportDomain) {
      setClientReportAuthorizedUrl(clientReportDomain.authorizedUrl || '');
      setClientReportInfringingUrls(clientReportDomain.infringingUrls || '');
      setClientReportWorkDescription(clientReportDomain.workDescription || '');
    }
  }
}, [clientReportDrawerVisible]);
```

#### Thêm nút "Save URLs to Domain":
```jsx
<Button
  type="primary"
  icon={<SaveOutlined />}
  onClick={async () => {
    const success = await updateDomainUrls(clientReportDomain._id, {
      authorizedUrl: clientReportAuthorizedUrl,
      infringingUrls: clientReportInfringingUrls,
      workDescription: clientReportWorkDescription,
    });
    
    if (success) {
      message.success('URLs saved to domain successfully!');
    }
  }}
>
  Save URLs to Domain
</Button>
```

---

## How It Works

### Khi mở Client Report Drawer:
1. Frontend load thông tin profile của user (Name, Company, Phone, etc.)
2. **Đồng thời** load URLs từ domain: `authorizedUrl`, `infringingUrls`, `workDescription`
3. Nếu domain chưa có data → để trống (hoặc fallback localStorage)

### Khi user nhập thông tin:
1. User nhập Authorized URL, Infringing URLs, Work Description
2. Click nút **"Save URLs to Domain"**
3. Frontend gọi `PATCH /api/domains/:id/urls`
4. Backend lưu vào domain trong database
5. Refresh domains list để có data mới

### Khi đổi sang domain khác:
1. Drawer tự động reload
2. Load URLs của domain mới
3. **Mỗi domain có thông tin riêng!**

---

## API Endpoint

### PATCH /api/domains/:id/urls
**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "authorizedUrl": "https://example.com/original",
  "infringingUrls": "https://pirate1.com\nhttps://pirate2.com",
  "workDescription": "My copyrighted work description"
}
```

**Response:**
```json
{
  "_id": "domain_id",
  "domain": "pirate1.com",
  "reason": "...",
  "authorizedUrl": "https://example.com/original",
  "infringingUrls": "https://pirate1.com\nhttps://pirate2.com",
  "workDescription": "My copyrighted work description",
  ...
}
```

---

## UI Flow

```
┌─────────────────────────────────────────────┐
│ Client Report - pirate1.com                 │
├─────────────────────────────────────────────┤
│ Domain: pirate1.com                         │
│ Reason: [malware distribution...]          │
│                                             │
│ ┌─── User Profile (Same for all) ────┐    │
│ │ Name: [John Doe____________]        │    │
│ │ Company: [ABC Corp_________]        │    │
│ │ Phone: [123456789__________]        │    │
│ │ [💾 Save Profile]                   │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─── Domain-Specific URLs ───────────┐    │
│ │ Authorized URL:                     │    │
│ │ [https://mysite.com/original__]    │    │
│ │                                     │    │
│ │ Infringing URLs:                    │    │
│ │ [https://pirate1.com________]      │    │
│ │ [https://pirate2.com________]      │    │
│ │                                     │    │
│ │ Work Description:                   │    │
│ │ [My copyrighted content____]       │    │
│ │                                     │    │
│ │ [💾 Save URLs to Domain]           │    │
│ └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## Benefits

✅ **Mỗi domain có URLs riêng** - Không bị conflict giữa các domain

✅ **Persistent** - Lưu trong database, không mất khi clear browser

✅ **Auto-load khi chọn domain** - Không cần nhập lại

✅ **Phù hợp với DMCA** - Mỗi domain vi phạm có authorized URL khác nhau

✅ **Easy to edit** - Click vào domain → Sửa URLs → Save

---

## Use Case Example

### Scenario: Report 3 domains vi phạm bản quyền

**Domain 1**: `pirate1.com`
- Authorized URL: `https://mysite.com/product-a`
- Infringing URLs: `https://pirate1.com/stolen/product-a`
- Work Description: "Product A - my original work"

**Domain 2**: `pirate2.com`
- Authorized URL: `https://mysite.com/product-b`
- Infringing URLs: `https://pirate2.com/fake/product-b`
- Work Description: "Product B - copyrighted content"

**Domain 3**: `pirate3.com`
- Authorized URL: `https://mysite.com/product-c`
- Infringing URLs: `https://pirate3.com/illegal/product-c`
- Work Description: "Product C - my protected IP"

→ **Mỗi domain có thông tin riêng, phù hợp với DMCA form!**

---

## Testing

1. **Thêm domain** mới (ví dụ: `pirate1.com`)
2. Click vào domain → **Open Client Report**
3. Nhập:
   - Authorized URL: `https://mysite.com/original`
   - Infringing URLs: `https://pirate1.com`
   - Work Description: `My copyrighted work`
4. Click **"Save URLs to Domain"**
5. Đóng drawer
6. **Click vào domain khác** (ví dụ: `pirate2.com`)
7. Nhập URLs khác và Save
8. **Quay lại domain đầu tiên** (`pirate1.com`)
9. → URLs vẫn là `https://mysite.com/original` (không bị ghi đè!)

---

## Notes

- ✅ **Profile fields** (Name, Company, Phone) → Lưu theo **user account**
- ✅ **URLs fields** (Authorized URL, Infringing URLs) → Lưu theo **domain**
- ✅ Vẫn fallback về localStorage nếu domain chưa có data
- ✅ Khi report, extension/puppeteer sẽ dùng URLs từ domain
