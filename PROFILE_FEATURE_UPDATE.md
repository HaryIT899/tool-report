# Profile Management Feature - User Account Integration

## Tổng quan
Đã thêm tính năng **lưu thông tin profile theo tài khoản user**, thay vì lưu vào localStorage. Giờ khi admin đăng nhập, các field như Email, Name, Company, Phone, Signature sẽ **tự động load từ profile của tài khoản đó**.

---

## Changes Made

### 1. Backend - User Schema Update
**File**: `backend/src/modules/users/schemas/user.schema.ts`

Đã thêm các field profile vào User schema:
```typescript
@Prop()
name?: string;

@Prop()
company?: string;

@Prop()
phone?: string;

@Prop()
title?: string;

@Prop()
signature?: string;
```

### 2. Backend - Users Service
**File**: `backend/src/modules/users/users.service.ts`

Thêm method `updateProfile`:
```typescript
async updateProfile(id: string, profileData: Partial<User>): Promise<UserDocument>
```

### 3. Backend - Users Controller (NEW)
**File**: `backend/src/modules/users/users.controller.ts`

Tạo controller mới với 2 endpoints:
- `GET /api/users/profile` - Lấy thông tin profile của user đang login
- `PUT /api/users/profile` - Cập nhật profile của user đang login

### 4. Backend - Update Profile DTO (NEW)
**File**: `backend/src/modules/users/dto/update-profile.dto.ts`

DTO cho việc update profile với validation.

### 5. Backend - Auth Service Update
**File**: `backend/src/modules/auth/auth.service.ts`

Cập nhật `generateToken` để return profile fields khi login:
```typescript
user: {
  id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  name: user.name,
  company: user.company,
  phone: user.phone,
  title: user.title,
  signature: user.signature,
}
```

### 6. Frontend - Dashboard Update
**File**: `frontend/src/pages/DashboardEnhanced.jsx`

#### Thêm function `updateUserProfile`:
Gọi API để update profile lên backend.

#### Update `useEffect` để load profile:
```javascript
useEffect(() => {
  if (clientReportDrawerVisible) {
    // Fetch user profile from backend
    fetch('/api/users/profile')
      .then(res => res.json())
      .then(profile => {
        // Use profile data if available
        setClientReportEmail(profile.email || ...);
        setClientReportName(profile.name || ...);
        // ...
      });
  }
}, [clientReportDrawerVisible]);
```

#### Update input `onBlur` handlers:
Khi user blur khỏi input (sau khi chỉnh sửa), tự động save lên backend:
```javascript
onBlur={() => {
  updateUserProfile({ name: clientReportName });
}}
```

---

## How It Works

### Khi user đăng nhập:
1. Backend trả về JWT token + user info (bao gồm profile fields)
2. Frontend lưu token vào localStorage

### Khi mở Client Report Drawer:
1. Frontend gọi `GET /api/users/profile` với JWT token
2. Backend trả về profile của user đó
3. Frontend tự động fill các field với data từ profile
4. **Fallback**: Nếu profile chưa có data → dùng localStorage (backward compatible)

### Khi user thay đổi thông tin:
1. User nhập/sửa field (Name, Company, Phone, etc.)
2. Khi blur khỏi field → `onBlur` trigger
3. Frontend gọi `PUT /api/users/profile` để save lên backend
4. **Đồng thời** vẫn lưu vào localStorage (để backward compatible)

### Khi user đăng nhập lần sau:
- Thông tin profile được load từ backend
- **Không cần nhập lại**

---

## API Endpoints

### GET /api/users/profile
**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "id": "user_id",
  "username": "admin",
  "email": "admin@example.com",
  "role": "admin",
  "name": "John Doe",
  "company": "ABC Corp",
  "phone": "123456789",
  "title": "Manager",
  "signature": "John Doe"
}
```

### PUT /api/users/profile
**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "John Doe",
  "company": "ABC Corp",
  "phone": "123456789",
  "title": "Manager",
  "signature": "John Doe"
}
```

**Response:**
```json
{
  "id": "user_id",
  "username": "admin",
  "email": "admin@example.com",
  "role": "admin",
  "name": "John Doe",
  "company": "ABC Corp",
  "phone": "123456789",
  "title": "Manager",
  "signature": "John Doe"
}
```

---

## Benefits

✅ **Mỗi user có profile riêng** - Không bị conflict khi nhiều người dùng chung máy

✅ **Auto-load khi đăng nhập** - Không cần nhập lại mỗi lần

✅ **Đồng bộ cross-device** - Login từ máy khác vẫn có thông tin

✅ **Backward compatible** - Vẫn fallback về localStorage nếu cần

✅ **Auto-save** - Tự động lưu khi blur khỏi field

---

## Testing

1. **Login** với tài khoản admin
2. Mở **Client Report** drawer
3. Nhập thông tin vào các field: Name, Company, Phone, Signature
4. Blur khỏi field (click ra ngoài)
5. **Logout** và **Login lại**
6. Mở Client Report drawer → Thông tin vẫn còn đó!

---

## Notes

- Email field không được save vào profile vì email đã có trong user account
- Các field khác (Authorized URL, Infringing URLs, Work Description) vẫn lưu vào localStorage vì không cần lưu theo user
- Nếu API call fail → fallback về localStorage (không bị lỗi)
