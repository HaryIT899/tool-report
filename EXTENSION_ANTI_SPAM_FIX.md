# Extension Anti-Spam Fix

## 🐛 Vấn đề cũ:
Extension fill form liên tục vì `MutationObserver` trigger mỗi khi DOM thay đổi:
- User click button → form fill → DOM change → trigger observer → fill lại → DOM change → fill lại... ♾️
- Dẫn đến spam input fields và có thể bị Google/sites detect là bot

## ✅ Giải pháp mới:

### 1. **Giới hạn số lần fill tối đa**
```javascript
if (autofillAttemptCount >= 5) {
  console.log('✋ Max autofill attempts reached (5), stopping to avoid spam');
  stopAutofill();
  return;
}
```
- Tối đa **5 lần thử** thay vì vô hạn
- Mỗi lần fill cách nhau ít nhất **1.5s** (thay vì 650ms)

### 2. **Auto-stop sau khi fill thành công**
Mỗi handler function (Cloudflare, DMCA, Google, etc.) sẽ tự dừng sau khi hoàn tất:
```javascript
autofillCompleted = true;
setTimeout(() => stopAutofill(), 1000);
```

### 3. **Timeout ngắn hơn**
- Giảm từ **90s → 30s** để tránh fill lại nhiều lần
- Đủ thời gian cho page load và fill 1-2 lần

### 4. **Smart retry logic**
```javascript
// Sau khi fill xong, đợi 3s rồi dừng hẳn
setTimeout(() => {
  if (autofillAttemptCount >= 2) {
    console.log('✅ Autofill completed after', autofillAttemptCount, 'attempts');
    autofillCompleted = true;
    stopAutofill();
  }
}, 3000);
```

## 📊 Flow mới:

### Scenario 1: Fill thành công ngay lần 1
```
t=0s:   Page load
t=1s:   Fill attempt #1 ✓
t=4s:   Auto-stop (completed = true)
→ Total: 1 lần fill
```

### Scenario 2: Cần retry do page chưa ready
```
t=0s:   Page load
t=1s:   Fill attempt #1 (page chưa ready, không fill được)
t=2.5s: Fill attempt #2 ✓ (page ready rồi)
t=5.5s: Auto-stop (completed = true)
→ Total: 2 lần fill
```

### Scenario 3: Page load chậm
```
t=0s:   Page load
t=1s:   Fill attempt #1 (fail)
t=3s:   Fill attempt #2 (fail)
t=5s:   Fill attempt #3 ✓
t=8s:   Auto-stop
→ Total: 3 lần fill (tối đa 5)
```

### Scenario 4: Timeout safety
```
t=0s:   Page load
t=1-30s: Fill attempts (max 5 lần)
t=30s:  Hard timeout → force stop
→ Đảm bảo không fill vô hạn
```

## 🔧 Các thay đổi chi tiết:

### File: `chrome-extension/content.js`

#### 1. Thêm biến tracking:
```javascript
let autofillAttemptCount = 0;
let autofillCompleted = false;
```

#### 2. Update `runAutofill()`:
- Kiểm tra `autofillCompleted` flag
- Giới hạn max 5 attempts
- Tăng delay giữa các lần thử: 650ms → 1500ms
- Log chi tiết mỗi attempt

#### 3. Update `scheduleAutofill()`:
- Timeout: 90s → 30s
- Reset counters mỗi lần schedule mới
- Check `autofillCompleted` trong observer

#### 4. Update tất cả handlers:
- `handleCloudflareRegistrarWhois()`
- `handleRadixAbuse()`
- `handleGoogleDmca()`
- `handleGoogleSearchConsoleSpam()`
- `handleGoogleSearchFeedback()`
- `handleGoogleSafeBrowsingReportPhish()`
- `fillFormGeneric()`

Tất cả đều thêm:
```javascript
autofillCompleted = true;
setTimeout(() => stopAutofill(), 1000);
```

## 🎯 Kết quả:

### Trước khi fix:
❌ Fill 10-20 lần trong 90s  
❌ Spam input fields  
❌ Có thể bị detect  
❌ CPU cao do MutationObserver  

### Sau khi fix:
✅ Fill tối đa 5 lần  
✅ Stop ngay sau khi thành công (thường 1-2 lần)  
✅ Delay hợp lý (1.5s giữa các lần)  
✅ Timeout 30s an toàn  
✅ Log rõ ràng để debug  

## 📝 Testing:

1. **Test normal case** (page load nhanh):
   - Mở 1 tab → should fill 1 lần → stop

2. **Test slow load** (page load chậm):
   - Mở 1 tab → retry 2-3 lần → fill thành công → stop

3. **Test multiple tabs** (5 tabs cùng lúc):
   - Mỗi tab fill độc lập
   - Không bị spam
   - Mỗi tab stop riêng sau khi fill xong

4. **Test timeout**:
   - Nếu page không bao giờ ready → stop sau 30s

## 🚀 Reload Extension:

Sau khi update code:
1. Mở `chrome://extensions/`
2. Tìm extension "Domain Abuse Reporter"
3. Click nút **Reload** (icon reload)
4. Test lại flow

Done! Extension giờ sẽ fill **1 lần** rồi dừng, không spam nữa! 🎉
