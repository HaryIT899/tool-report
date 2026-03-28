const fillInput = (selectors, value) => {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.focus();
        return true;
      }
    }
  }
  return false;
};

const fillForm = (data) => {
  const { domain, reason, email } = data;

  const domainSelectors = [
    'input[name="url"]',
    'input[name="domain"]',
    'input[name="website"]',
    'input[type="url"]',
    'textarea[name="url"]',
    'input[placeholder*="domain" i]',
    'input[placeholder*="url" i]',
    'input[id*="url" i]',
    'input[id*="domain" i]',
    '#url',
    '#domain',
    '#website',
  ];

  const reasonSelectors = [
    'textarea[name="description"]',
    'textarea[name="reason"]',
    'textarea[name="details"]',
    'textarea[name="comments"]',
    'textarea[name="message"]',
    'textarea[name="additional_info"]',
    'textarea[placeholder*="description" i]',
    'textarea[placeholder*="reason" i]',
    'textarea[placeholder*="details" i]',
    '#description',
    '#reason',
    '#details',
    '#comments',
    '#message',
  ];

  const emailSelectors = [
    'input[name="email"]',
    'input[type="email"]',
    'input[placeholder*="email" i]',
    '#email',
    '#contact_email',
  ];

  let filled = 0;

  if (domain && fillInput(domainSelectors, domain)) {
    filled++;
    console.log('✓ Domain filled:', domain);
  }

  if (reason && fillInput(reasonSelectors, reason)) {
    filled++;
    console.log('✓ Reason filled');
  }

  if (email && fillInput(emailSelectors, email)) {
    filled++;
    console.log('✓ Email filled:', email);
  }

  if (filled > 0) {
    showNotification(`Auto-filled ${filled} field(s). Please complete captcha and submit.`);
  } else {
    showNotification('Could not auto-fill fields. Please fill manually.');
  }
};

const showNotification = (message) => {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1890ff;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 999999;
    font-family: Arial, sans-serif;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    fillForm(request.data);
    sendResponse({ success: true });
  }
  return true;
});

const detectPage = () => {
  const url = window.location.href;
  const supported = [
    'search.google.com/search-console/report-spam',
    'safebrowsing.google.com/safebrowsing/report_phish',
    'reportcontent.google.com/forms',
    'abuse.cloudflare.com',
    'abuse.radix.website',
  ];

  if (supported.some((pattern) => url.includes(pattern))) {
    console.log('Domain Abuse Reporter: Supported page detected');
    showNotification('Page detected! Extension ready for auto-fill.');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', detectPage);
} else {
  detectPage();
}

window.addEventListener('message', (event) => {
  if (event.data.type === 'FILL_REPORT_FORM') {
    fillForm(event.data.payload);
  }
});

console.log('Domain Abuse Reporter Extension: Content script loaded');
