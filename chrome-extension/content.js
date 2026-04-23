const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const normText = (s) => String(s || '').trim();

const setNativeValue = (element, value) => {
  if (!element) return;
  const proto =
    element.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement?.prototype
      : window.HTMLInputElement?.prototype;
  const desc = proto ? Object.getOwnPropertyDescriptor(proto, 'value') : null;
  const setter = desc && typeof desc.set === 'function' ? desc.set : null;
  if (setter) setter.call(element, value);
  else element.value = value;
};

const dispatchInputEvents = (element, data) => {
  try {
    if (typeof window.InputEvent === 'function') {
      element.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          composed: true,
          data: typeof data === 'string' ? data : null,
          inputType: 'insertText',
        }),
      );
    } else {
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } catch {
    try {
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } catch {}
  }
  try {
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } catch {}
};

const b64UrlDecodeJson = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  let b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const encoded = Array.from(bin)
    .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
    .join('');
  const json = decodeURIComponent(encoded);
  return JSON.parse(json);
};

const getPayloadFromHash = () => {
  const h = String(window.location.hash || '').replace(/^#/, '').trim();
  console.log('getPayloadFromHash - hash:', h ? h.substring(0, 50) + '...' : 'empty');
  if (!h) return null;
  if (h.startsWith('dar=')) {
    const v = h.slice('dar='.length);
    try {
      const decoded = b64UrlDecodeJson(v);
      console.log('✓ Decoded payload from hash:', decoded);
      return decoded;
    } catch (e) {
      console.error('❌ Failed to decode hash:', e);
      return null;
    }
  }
  try {
    const params = new URLSearchParams(h);
    const v = params.get('dar');
    if (!v) {
      console.log('No dar param in hash');
      return null;
    }
    const decoded = b64UrlDecodeJson(v);
    console.log('✓ Decoded payload from URLSearchParams:', decoded);
    return decoded;
  } catch (e) {
    console.error('❌ Failed to parse hash:', e);
    return null;
  }
};

const getPayloadFromWindowName = () => {
  const n = String(window.name || '').trim();
  if (!n) return null;
  const prefixes = ['dar_', 'dar:'];
  const prefix = prefixes.find((p) => n.startsWith(p));
  if (!prefix) return null;
  const v = n.slice(prefix.length).trim();
  if (!v) return null;
  try {
    return b64UrlDecodeJson(v);
  } catch {
    return null;
  }
};

const fillInput = (selectors, value) => {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        setNativeValue(element, value);
        dispatchInputEvents(element, value);
        element.focus();
        return true;
      }
    }
  }
  return false;
};

const typeLikeHuman = async (element, value, { clear = true } = {}) => {
  const v = String(value ?? '');
  if (!element) return false;
  try {
    element.scrollIntoView({ block: 'center', inline: 'center' });
  } catch {}
  try {
    element.click();
  } catch {}
  element.focus();
  if (clear) {
    try {
      setNativeValue(element, '');
      dispatchInputEvents(element, '');
    } catch {}
  }
  let cur = '';
  for (const ch of v) {
    cur += ch;
    setNativeValue(element, cur);
    dispatchInputEvents(element, ch);
    try {
      element.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: ch, code: '', keyCode: ch.charCodeAt(0) }),
      );
      element.dispatchEvent(
        new KeyboardEvent('keyup', { bubbles: true, key: ch, code: '', keyCode: ch.charCodeAt(0) }),
      );
    } catch {}
    await sleep(rand(25, 90));
  }
  dispatchInputEvents(element, null);
  try {
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  } catch {}

  const ok = normText(element.value) === normText(v);
  if (!ok) {
    try {
      setNativeValue(element, v);
      dispatchInputEvents(element, v);
    } catch {}
  }
  return true;
};

const findByText = (rootSelector, predicate) => {
  const nodes = Array.from(document.querySelectorAll(rootSelector));
  return nodes.find((n) => predicate(normText(n.textContent || ''))) || null;
};

const findInputByAriaContains = (tag, parts) => {
  const els = Array.from(document.querySelectorAll(`${tag}[aria-label]`));
  const lowered = parts.map((p) => String(p).toLowerCase());
  return (
    els.find((el) => {
      const a = String(el.getAttribute('aria-label') || '').toLowerCase();
      return lowered.some((p) => a.includes(p));
    }) || null
  );
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

const handleCloudflareRegistrarWhois = async (payload) => {
  await sleep(rand(500, 1200));
  const email = normText(payload.email);
  const name = normText(payload.name);
  const title = normText(payload.title);
  const company = normText(payload.company);
  const phone = normText(payload.phone);
  const urlsValue = normText(payload.infringingUrls || payload.authorizedUrl || payload.domain);
  const commentsValue = normText(payload.reason).slice(0, 1000);

  const type = async (selector, value) => {
    const el = document.querySelector(selector);
    if (!el || !value) return false;
    try {
      el.scrollIntoView({ block: 'center', inline: 'center' });
    } catch {}
    await sleep(rand(80, 250));
    return typeLikeHuman(el, value);
  };

  if (name) await type('input[name="name"]', name);
  if (email) {
    await type('input[name="email"]', email);
    await type('input[name="email2"]', email);
  }
  if (title) await type('input[name="title"]', title);
  if (company) await type('input[name="company"]', company);
  if (phone) await type('input[name="tele"]', phone);
  await type('textarea[name="urls"]', urlsValue);
  await type('textarea[name="comments"]', commentsValue);

  try {
    const labels = Array.from(document.querySelectorAll('label'));
    const first = labels.find((l) =>
      normText(l.textContent).toLowerCase().includes('please forward my report'),
    );
    if (first) first.click();
    await sleep(rand(150, 400));
    const second = labels.find((l) =>
      normText(l.textContent).toLowerCase().includes('include my name and contact information'),
    );
    if (second) second.click();
  } catch {}

  showNotification('✅ Cloudflare filled. Hãy kiểm tra lại rồi tự submit.');
  
  // Đánh dấu hoàn tất để dừng autofill
  autofillCompleted = true;
  setTimeout(() => stopAutofill(), 1000);
};

const handleCloudflareThreat = async (payload) => {
  console.log('[Cloudflare Threat] Starting autofill...');
  await sleep(rand(500, 1200));
  
  const email = normText(payload.email);
  const name = normText(payload.name);
  const title = normText(payload.title);
  const company = normText(payload.company);
  const phone = normText(payload.phone);
  const urlsValue = normText(payload.infringingUrls || payload.domain);
  const justificationValue = normText(payload.reason).slice(0, 2000);
  const commentsValue = normText(payload.reason).slice(0, 1000); // Use reason for comments too

  const type = async (selector, value) => {
    const el = document.querySelector(selector);
    if (!el || !value) return false;
    try {
      el.scrollIntoView({ block: 'center', inline: 'center' });
    } catch {}
    await sleep(rand(80, 250));
    return typeLikeHuman(el, value);
  };

  // Fill all text fields
  if (name) await type('input[name="name"]', name);
  if (email) {
    await type('input[name="email"]', email);
    await type('input[name="email2"]', email);
  }
  if (title) await type('input[name="title"]', title);
  if (company) await type('input[name="company"]', company);
  if (phone) await type('input[name="tele"]', phone);
  
  if (urlsValue) await type('textarea[name="urls"]', urlsValue);
  if (justificationValue) await type('textarea[name="justification"]', justificationValue);
  if (commentsValue) await type('textarea[name="comments"]', commentsValue);

  // Check the required checkboxes (IN CORRECT ORDER)
  try {
    await sleep(rand(300, 600));
    
    const labels = Array.from(document.querySelectorAll('label'));
    console.log('[Cloudflare Threat] Found', labels.length, 'labels');
    
    // STEP 1: Check parent checkboxes first (to enable child checkboxes)
    const parentCheckboxes = [
      'please forward my report to the website hosting provider',
      'please forward my report to the website owner'
    ];
    
    for (const text of parentCheckboxes) {
      const label = labels.find((l) => 
        normText(l.textContent).toLowerCase().includes(text)
      );
      if (label) {
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (checkbox && !checkbox.checked) {
          try {
            label.scrollIntoView({ block: 'center', inline: 'center' });
          } catch {}
          await sleep(rand(200, 400));
          checkbox.click();
          console.log('[Cloudflare Threat] Checked parent:', text);
          await sleep(rand(300, 500)); // Wait for child checkbox to appear
        }
      }
    }
    
    // STEP 2: Check child checkboxes (include name)
    await sleep(rand(400, 800));
    
    const childCheckboxes = [
      'include my name and contact information with the report to the website hosting provider',
      'include my name and contact information with the report to the website owner'
    ];
    
    for (const text of childCheckboxes) {
      const label = labels.find((l) => 
        normText(l.textContent).toLowerCase().includes(text)
      );
      if (label) {
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (checkbox && !checkbox.checked) {
          try {
            label.scrollIntoView({ block: 'center', inline: 'center' });
          } catch {}
          await sleep(rand(150, 300));
          checkbox.click();
          console.log('[Cloudflare Threat] Checked child:', text);
        }
      }
    }
    
    // STEP 3: Check "I understand and agree"
    await sleep(rand(300, 600));
    
    const agreeLabel = labels.find((l) => 
      normText(l.textContent).toLowerCase().includes('i understand and agree')
    );
    if (agreeLabel) {
      const checkbox = agreeLabel.querySelector('input[type="checkbox"]');
      if (checkbox && !checkbox.checked) {
        try {
          agreeLabel.scrollIntoView({ block: 'center', inline: 'center' });
        } catch {}
        await sleep(rand(150, 300));
        checkbox.click();
        console.log('[Cloudflare Threat] Checked: I understand and agree');
      }
    }
  } catch (e) {
    console.log('[Cloudflare Threat] Checkbox error:', e);
  }

  // Handle Cloudflare Turnstile captcha
  await sleep(rand(800, 1500));
  
  const turnstileWidget = document.getElementById('turnstile_widget');
  const turnstileResponseInput = document.querySelector('input[name="cf-turnstile-response"]');
  
  if (turnstileWidget && turnstileResponseInput) {
    console.log('[Cloudflare Threat] Found Turnstile captcha');
    
    // Check if Turnstile uses Shadow DOM (closed)
    const hasShadowRoot = !!turnstileWidget.querySelector('template[shadowrootmode="closed"]');
    if (hasShadowRoot) {
      console.log('[Cloudflare Threat] ⚠️ Turnstile uses closed Shadow DOM - cannot bypass automatically');
      showNotification('⏸️ Vui lòng CLICK vào checkbox "Xác minh bạn là con người" để tiếp tục...');
      
      // Wait for user to solve Turnstile (monitor token appearance)
      let userSolveCount = 0;
      const maxUserChecks = 90; // 90 seconds
      
      while (userSolveCount < maxUserChecks) {
        await sleep(1000);
        userSolveCount++;
        
        const currentResponse = document.querySelector('input[name="cf-turnstile-response"]')?.value || '';
        
        if (userSolveCount % 10 === 0) {
          console.log(`[Cloudflare Threat] Waiting for user Turnstile solve... ${userSolveCount}/90s`);
          if (userSolveCount % 30 === 0) {
            showNotification(`⏳ Vẫn đang đợi... (${userSolveCount}/90s)`);
          }
        }
        
        if (currentResponse.length > 10) {
          console.log('[Cloudflare Threat] ✓ User solved Turnstile!');
          showNotification('✅ Turnstile đã xác minh! Đang submit...');
          await sleep(rand(1000, 2000));
          break;
        }
      }
      
      // Final check
      const finalResponse = document.querySelector('input[name="cf-turnstile-response"]')?.value || '';
      if (finalResponse.length <= 10) {
        showNotification('⏱️ Timeout: Vui lòng xác minh Turnstile và submit thủ công.');
        autofillCompleted = true;
        setTimeout(() => stopAutofill(), 1000);
        return;
      }
      
      // Auto submit after user solved
      await sleep(rand(1000, 2000));
      
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn && !submitBtn.disabled) {
        try {
          submitBtn.scrollIntoView({ block: 'center', inline: 'center' });
        } catch {}
        await sleep(rand(300, 600));
        submitBtn.click();
        console.log('[Cloudflare Threat] Submit clicked after user solved Turnstile!');
        showNotification('✅ Cloudflare Threat: Đã submit!');
      } else {
        showNotification('✅ Cloudflare Threat: Đã fill xong. Vui lòng click Submit.');
      }
      
      autofillCompleted = true;
      setTimeout(() => stopAutofill(), 1000);
      return;
    }
    
    // If no shadow root, continue with old logic
    const siteKey = turnstileWidget.getAttribute('data-sitekey');
    if (!siteKey) {
      console.error('[Cloudflare Threat] No sitekey found');
      showNotification('❌ Không tìm thấy Turnstile sitekey');
      autofillCompleted = true;
      setTimeout(() => stopAutofill(), 1000);
      return;
    }
    
    console.log('[Cloudflare Threat] Turnstile sitekey:', siteKey);
    
    // Try to trigger Turnstile by clicking on it
    showNotification('🔄 Đang trigger Cloudflare Turnstile...');
    console.log('[Cloudflare Threat] Triggering Turnstile...');
    
    try {
      // Method 1: Click on the Turnstile widget container
      turnstileWidget.scrollIntoView({ block: 'center', behavior: 'smooth' });
      await sleep(rand(500, 1000));
      
      // Try clicking different elements
      const clickableElements = [
        turnstileWidget.querySelector('iframe'),
        turnstileWidget.querySelector('label'),
        turnstileWidget.querySelector('input[type="checkbox"]'),
        turnstileWidget
      ];
      
      for (const el of clickableElements) {
        if (el) {
          try {
            el.click();
            console.log('[Cloudflare Threat] Clicked:', el.tagName);
          } catch {}
        }
      }
      
      // Method 2: Dispatch mouse events on widget
      const rect = turnstileWidget.getBoundingClientRect();
      const clickX = rect.left + rect.width / 2;
      const clickY = rect.top + rect.height / 2;
      
      ['mousedown', 'mouseup', 'click'].forEach(eventType => {
        const event = new MouseEvent(eventType, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: clickX,
          clientY: clickY
        });
        turnstileWidget.dispatchEvent(event);
      });
      
      console.log('[Cloudflare Threat] Dispatched mouse events');
    } catch (e) {
      console.log('[Cloudflare Threat] Click error:', e);
    }
    
    // Wait for Turnstile to auto-solve after trigger
    showNotification('⏳ Đang đợi Cloudflare Turnstile xác minh...');
    console.log('[Cloudflare Threat] Waiting for Turnstile to solve...');
    
    // Poll for Turnstile response
    let solveCount = 0;
    const maxSolveChecks = 30; // 30 seconds
    let autoSolved = false;
    
    while (solveCount < maxSolveChecks) {
      await sleep(1000);
      solveCount++;
      
      const currentResponse = document.querySelector('input[name="cf-turnstile-response"]')?.value || '';
      
      if (solveCount % 5 === 0) {
        console.log(`[Cloudflare Threat] Turnstile check ${solveCount}/30:`, {
          hasResponse: currentResponse.length > 10,
          responseLength: currentResponse.length
        });
      }
      
      if (currentResponse.length > 10) {
        console.log('[Cloudflare Threat] Turnstile auto-solved!');
        showNotification('✅ Turnstile đã xác minh! Đang submit...');
        autoSolved = true;
        break;
      }
    }
    
    if (!autoSolved) {
      // Turnstile didn't auto-solve, try 2Captcha
      showNotification('🔄 Đang giải Turnstile với 2Captcha...');
      console.log('[Cloudflare Threat] Auto-solve failed, trying 2Captcha...');
      
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'solve_turnstile',
          siteKey: siteKey,
          pageUrl: window.location.href
        });
        
        if (response.success && response.token) {
          console.log('[Cloudflare Threat] 2Captcha solved! Token:', response.token.substring(0, 50) + '...');
          
          // Method 1: Inject token into hidden input
          turnstileResponseInput.value = response.token;
          
          // Update all related inputs
          const allTurnstileInputs = document.querySelectorAll('input[name="cf-turnstile-response"]');
          allTurnstileInputs.forEach(input => {
            input.value = response.token;
          });
          
          console.log('[Cloudflare Threat] Token injected, attempting callbacks...');
          
          // Method 2: Try to call Turnstile callback
          try {
            // Look for turnstile object
            if (typeof window.turnstile !== 'undefined') {
              console.log('[Cloudflare Threat] Found window.turnstile:', Object.keys(window.turnstile || {}));
              
              // Try to get widget ID from iframe
              const iframe = turnstileWidget.querySelector('iframe');
              if (iframe) {
                const iframeId = iframe.id;
                console.log('[Cloudflare Threat] Turnstile iframe ID:', iframeId);
                
                // Try to call response function
                if (typeof window.turnstile.getResponse === 'function') {
                  try {
                    const widgetResponse = window.turnstile.getResponse(iframeId);
                    console.log('[Cloudflare Threat] Current widget response:', widgetResponse);
                  } catch {}
                }
              }
            }
            
            // Look for callback function name in data attributes
            const callbackName = turnstileWidget.getAttribute('data-callback');
            console.log('[Cloudflare Threat] data-callback:', callbackName);
            
            if (callbackName && typeof window[callbackName] === 'function') {
              console.log('[Cloudflare Threat] Calling callback function:', callbackName);
              window[callbackName](response.token);
            }
            
            // Try common callback names
            const commonCallbacks = ['onTurnstileSuccess', 'turnstileCallback', 'onCaptchaSuccess'];
            for (const cbName of commonCallbacks) {
              if (typeof window[cbName] === 'function') {
                console.log('[Cloudflare Threat] Trying callback:', cbName);
                try {
                  window[cbName](response.token);
                } catch (e) {
                  console.log('[Cloudflare Threat] Callback error:', cbName, e);
                }
              }
            }
          } catch (e) {
            console.log('[Cloudflare Threat] Callback search error:', e);
          }
          
          // Method 3: Trigger form validation
          try {
            const form = document.querySelector('form');
            if (form) {
              console.log('[Cloudflare Threat] Triggering form validation');
              form.dispatchEvent(new Event('change', { bubbles: true }));
              form.dispatchEvent(new Event('input', { bubbles: true }));
              
              // Also dispatch on turnstile input
              turnstileResponseInput.dispatchEvent(new Event('input', { bubbles: true }));
              turnstileResponseInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } catch (e) {
            console.log('[Cloudflare Threat] Form validation error:', e);
          }
          
          // Method 4: Print current state for debugging
          console.log('[Cloudflare Threat] Current state:', {
            inputValue: turnstileResponseInput.value.substring(0, 50),
            inputLength: turnstileResponseInput.value.length,
            widgetHTML: turnstileWidget.outerHTML.substring(0, 200)
          });
          
          showNotification('✅ Token injected. Đang đợi Cloudflare validate...');
          await sleep(rand(3000, 5000)); // Wait longer for Cloudflare to validate
          
          // Check if submit button became enabled
          const submitBtn = document.querySelector('button[type="submit"]');
          if (submitBtn) {
            const isDisabled = submitBtn.disabled || submitBtn.hasAttribute('disabled');
            console.log('[Cloudflare Threat] Submit button state:', { disabled: isDisabled });
            
            if (isDisabled) {
              showNotification('⚠️ Token đã inject nhưng form vẫn disabled. Vui lòng xác minh Turnstile thủ công.');
              // Don't auto-submit if button is still disabled
              autofillCompleted = true;
              setTimeout(() => stopAutofill(), 1000);
              return;
            }
          }
          
          showNotification('✅ Turnstile validated! Đang submit...');
        } else {
          console.error('[Cloudflare Threat] 2Captcha failed:', response.error);
          showNotification('❌ 2Captcha lỗi: ' + response.error);
          
          // Fallback: wait for user
          showNotification('⏸️ Vui lòng xác minh Turnstile thủ công...');
          
          let userSolveCount = 0;
          const maxUserChecks = 60;
          
          while (userSolveCount < maxUserChecks) {
            await sleep(1000);
            userSolveCount++;
            
            const currentResponse = document.querySelector('input[name="cf-turnstile-response"]')?.value || '';
            
            if (currentResponse.length > 10) {
              console.log('[Cloudflare Threat] User solved Turnstile!');
              showNotification('✅ Turnstile đã xác minh! Đang submit...');
              break;
            }
          }
          
          const finalResponse = document.querySelector('input[name="cf-turnstile-response"]')?.value || '';
          if (finalResponse.length <= 10) {
            showNotification('⏱️ Timeout: Vui lòng submit thủ công.');
            autofillCompleted = true;
            setTimeout(() => stopAutofill(), 1000);
            return;
          }
        }
      } catch (error) {
        console.error('[Cloudflare Threat] 2Captcha error:', error);
        showNotification('❌ Lỗi: ' + error.message);
        autofillCompleted = true;
        setTimeout(() => stopAutofill(), 1000);
        return;
      }
    }
    
    // Auto submit
    await sleep(rand(1000, 2000));
    
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
      try {
        submitBtn.scrollIntoView({ block: 'center', inline: 'center' });
      } catch {}
      await sleep(rand(300, 600));
      submitBtn.click();
      console.log('[Cloudflare Threat] Submit clicked!');
      showNotification('✅ Cloudflare Threat: Đã fill và submit!');
    } else {
      showNotification('✅ Cloudflare Threat: Đã fill xong. Vui lòng click Submit.');
    }
  } else {
    // No captcha found, just notify
    showNotification('✅ Cloudflare Threat: Đã fill xong. Hãy kiểm tra và submit.');
  }
  
  autofillCompleted = true;
  setTimeout(() => stopAutofill(), 1000);
};

const handleRadixAbuse = async (payload) => {
  await sleep(rand(600, 1300));
  const domain = normText(payload.domain);
  const email = normText(payload.email);
  const name = normText(payload.name);
  const messageValue = normText(payload.reason).slice(0, 1500);

  const search = document.querySelector('#search');
  if (search && domain) {
    try {
      search.scrollIntoView({ block: 'center' });
    } catch {}
    await typeLikeHuman(search, domain);
  }

  await sleep(rand(250, 700));
  const submitBtn =
    findByText('button', (t) => t.toLowerCase() === 'submit') ||
    document.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.click();
  }

  const waitForPhase2 = async () => {
    for (let i = 0; i < 50; i++) {
      const ok =
        !!document.querySelector('button.accordion-button[data-bs-target="#report-other"]') ||
        !!document.querySelector('#report-other') ||
        !!findByText('button', (t) => t.toLowerCase() === 'report as other');
      if (ok) return true;
      await sleep(300);
    }
    return false;
  };

  await waitForPhase2();
  await sleep(rand(200, 600));

  const accordion =
    document.querySelector('button.accordion-button[data-bs-target="#report-other"]') ||
    findByText('button', (t) => t.toLowerCase().includes('other'));
  if (accordion) {
    accordion.click();
  }

  await sleep(rand(250, 700));

  const reportOtherBtn = findByText('button', (t) => t.toLowerCase() === 'report as other');
  if (reportOtherBtn) reportOtherBtn.click();

  const waitForPhase3 = async () => {
    for (let i = 0; i < 50; i++) {
      const ok =
        !!document.querySelector('#message') ||
        !!document.querySelector('textarea#message') ||
        !!document.querySelector('input[type="email"]');
      if (ok) return true;
      await sleep(300);
    }
    return false;
  };

  await waitForPhase3();
  await sleep(rand(200, 600));

  const nameEl =
    document.querySelector('#name') ||
    document.querySelector('input[name="name"]') ||
    document.querySelector('input[placeholder*="name" i]');
  if (nameEl && name) await typeLikeHuman(nameEl, name);

  const emailEl = document.querySelector('#email') || document.querySelector('input[type="email"]');
  if (emailEl && email) await typeLikeHuman(emailEl, email);

  const msgEl =
    document.querySelector('#message') ||
    document.querySelector('textarea#message') ||
    document.querySelector('textarea[name="message"]');
  if (msgEl && messageValue) await typeLikeHuman(msgEl, messageValue);

  const check = document.querySelector('#checkFormData');
  if (check && !check.checked) check.click();

  await sleep(rand(500, 1000));
  
  // 🔥 AUTO SUBMIT
  const finalSubmitBtn = 
    findByText('button', (t) => t.toLowerCase() === 'submit') ||
    document.querySelector('button[type="submit"]') ||
    document.querySelector('button.btn-primary');
  
  if (finalSubmitBtn) {
    try {
      finalSubmitBtn.scrollIntoView({ block: 'center', inline: 'center' });
    } catch {}
    await sleep(rand(300, 600));
    finalSubmitBtn.click();
    showNotification('✅ Radix: Đã fill và tự động submit!');
  } else {
    showNotification('⚠️ Radix: Đã fill xong nhưng không tìm thấy nút Submit');
  }
  
  // Đánh dấu hoàn tất để dừng autofill
  autofillCompleted = true;
  setTimeout(() => stopAutofill(), 1000);
};

const handleGoogleDmca = async (payload) => {
  await sleep(rand(600, 1200));
  const bodyText = normText(document.body?.innerText || '').toLowerCase();
  const hasEmailInput = !!document.querySelector('input[type="email"]');
  const hasVerify = !!findByText('button,[role="button"]', (t) => t.toLowerCase() === 'verify');
  const emailGate =
    hasEmailInput &&
    hasVerify &&
    (bodyText.includes('enter your email address') || bodyText.includes('verify'));

  if (emailGate) {
    showNotification('DMCA đang yêu cầu Verify email. Bạn tự verify rồi bấm lại Open + Autofill.');
    return;
  }

  const firstName = normText(payload.firstName);
  // DMCA: lastName lấy từ signature field, signature thật = firstName + lastName
  const lastName = normText(payload.signature || payload.lastName);
  const company = normText(payload.company);
  const dmcaSignature = [firstName, lastName].filter(Boolean).join(' ').trim();
  const workDescription = normText(payload.workDescription || payload.reason);
  const authorizedUrl = normText(payload.authorizedUrl);
  const infringingUrls = normText(payload.infringingUrls || payload.domain);

  const typeIf = async (el, val) => {
    if (!el || !val) return false;
    try {
      el.scrollIntoView({ block: 'center', inline: 'center' });
    } catch {}
    await sleep(rand(80, 250));
    return typeLikeHuman(el, val);
  };

  // Fill all input fields by looping through all inputs with aria-label
  const allInputs = Array.from(document.querySelectorAll('input[aria-label]'));
  
  for (const input of allInputs) {
    const label = (input.getAttribute('aria-label') || '').toLowerCase();
    let value = null;
    
    if (label.includes('first') && label.includes('name')) {
      value = firstName;
    } else if (label.includes('last') && label.includes('name')) {
      value = lastName;
    } else if (label.includes('company') || label.includes('organization')) {
      value = company;
    } else if (label.includes('signature') || label.includes('chữ ký')) {
      value = dmcaSignature;
    }
    
    if (value && !input.value) {
      await typeIf(input, value);
      await sleep(rand(300, 800));
    }
  }
  
  await sleep(rand(400, 1100));

  const workDescEl =
    findInputByAriaContains('textarea', ['describe the copyrighted work', 'tác phẩm']) ||
    findInputByAriaContains('textarea', ['enter your description here']);
  await typeIf(workDescEl, workDescription);
  await sleep(rand(400, 1100));

  const authEl =
    findInputByAriaContains('textarea', ['authorized example', 'mẫu được cấp phép']) ||
    findInputByAriaContains('textarea', ['enter your examples here']);
  await typeIf(authEl, authorizedUrl);
  await sleep(rand(400, 1100));

  const infrEl =
    findInputByAriaContains('textarea', ['location of infringing', 'infringing material']) ||
    findInputByAriaContains('textarea', ['enter your url']);
  await typeIf(infrEl, infringingUrls);
  await sleep(rand(400, 1100));

  // Select "Yes" radio button FIRST (before checkboxes, as it may show/hide fields)
  try {
    await sleep(rand(300, 600));
    
    // Try to find radio by role="radio"
    const radioElements = Array.from(document.querySelectorAll('[role="radio"]'));
    console.log('[DMCA] Found radio elements:', radioElements.length);
    
    for (const radio of radioElements) {
      // Get text from .content div, not from the icon
      const contentDiv = radio.querySelector('.content');
      const text = contentDiv ? normText(contentDiv.textContent || '').toLowerCase() : '';
      const ariaLabel = (radio.getAttribute('aria-label') || '').toLowerCase();
      
      // Look for "Yes" radio button
      const isYes = text === 'yes' || text === 'có' || text.includes('yes') ||
                    ariaLabel.includes('yes') || ariaLabel.includes('có');
      
      console.log('[DMCA] Radio text:', text, 'aria-label:', ariaLabel, 'isYes:', isYes, 'checked:', radio.getAttribute('aria-checked'));
      
      if (isYes && radio.getAttribute('aria-checked') !== 'true') {
        try {
          radio.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } catch {}
        await sleep(rand(200, 400));
        radio.click();
        console.log('[DMCA] Clicked Yes radio');
        await sleep(rand(400, 800));
        break;
      }
    }
  } catch (e) {
    console.log('[DMCA] Radio error:', e);
  }

  // Fill date field
  try {
    await sleep(rand(400, 800));
    
    // Click on the date selector button
    const dateButton = document.querySelector('[aria-label*="Signed on this date"]');
    if (dateButton) {
      console.log('[DMCA] Found date button, clicking...');
      try {
        dateButton.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } catch {}
      await sleep(rand(300, 600));
      dateButton.click();
      await sleep(rand(800, 1500));
      
      // Wait for date picker popup to appear, then find the date input
      // Look for input inside material-input with label "Date"
      const dateInputs = Array.from(document.querySelectorAll('material-input input[type="text"]'));
      const dateInput = dateInputs.find(inp => {
        const labelId = inp.getAttribute('aria-labelledby');
        if (!labelId) return false;
        const labelEl = document.getElementById(labelId);
        return labelEl && normText(labelEl.textContent).toLowerCase() === 'date';
      });
      
      if (dateInput) {
        const today = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedDate = `${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
        
        console.log('[DMCA] Filling date:', formattedDate);
        
        // Clear first
        dateInput.value = '';
        dateInput.focus();
        await sleep(rand(200, 400));
        
        // Type the date
        await typeLikeHuman(dateInput, formattedDate);
        await sleep(rand(400, 800));
        
        // Press Enter to confirm
        dateInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        dateInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true }));
        await sleep(rand(600, 1000));
        
        console.log('[DMCA] Date filled and confirmed');
      } else {
        console.log('[DMCA] Date input not found in popup');
      }
    }
  } catch (e) {
    console.log('[DMCA] Date error:', e);
  }

  // Check all required checkboxes
  try {
    await sleep(rand(400, 800));
    
    const checkboxes = Array.from(document.querySelectorAll('material-checkbox[role="checkbox"]'));
    console.log('[DMCA] Found checkboxes:', checkboxes.length);
    
    for (const cb of checkboxes) {
      const isChecked = cb.getAttribute('aria-checked') === 'true';
      const label = cb.getAttribute('aria-labelledby') || '';
      
      console.log('[DMCA] Checkbox:', label, 'checked:', isChecked);
      
      if (!isChecked) {
        try {
          cb.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } catch {}
        await sleep(rand(200, 400));
        cb.click();
        console.log('[DMCA] Clicked checkbox:', label);
        await sleep(rand(300, 600));
      }
    }
  } catch (e) {
    console.log('[DMCA] Checkbox error:', e);
  }

  // Solve reCAPTCHA and auto-submit
  try {
    await sleep(rand(1500, 2500));
    
    // Find reCAPTCHA site key (with retry to wait for iframe load)
    const captchaInfo = await new Promise(async (resolve) => {
      let attempts = 0;
      const maxAttempts = 10;
      
      const checkCaptcha = async () => {
        attempts++;
        console.log(`[DMCA] Checking for captcha (attempt ${attempts}/${maxAttempts})...`);
        
        // Method 1: Check for recaptcha anchor (visible element)
        const recaptchaAnchor = document.getElementById('recaptcha-anchor');
        const rcContainer = document.getElementById('rc-anchor-container');
        
        if (recaptchaAnchor || rcContainer) {
          console.log('[DMCA] Found reCAPTCHA anchor element');
          
          // Try to find iframe with site key
          const iframes = document.querySelectorAll('iframe[src*="recaptcha"], iframe[src*="google.com/recaptcha"]');
          console.log('[DMCA] Found reCAPTCHA iframes:', iframes.length);
          
          for (const iframe of iframes) {
            const src = iframe.src;
            console.log('[DMCA] Checking iframe src:', src.substring(0, 100));
            const match = src.match(/[?&]k=([^&]+)/);
            if (match) {
              const siteKey = match[1];
              console.log('[DMCA] Found reCAPTCHA site key:', siteKey);
              resolve({ found: true, siteKey });
              return;
            }
          }
        }
        
        // Method 2: Check for textarea response (in case loaded differently)
        const responses = document.querySelectorAll('textarea[name="g-recaptcha-response"]');
        if (responses.length > 0) {
          console.log('[DMCA] Found g-recaptcha-response textareas:', responses.length);
          
          // Check if already solved
          for (const resp of responses) {
            if (resp.value && resp.value.length > 10) {
              console.log('[DMCA] Captcha already solved');
              resolve({ found: false, alreadySolved: true });
              return;
            }
          }
          
          // Try to extract site key from parent element attributes
          const container = responses[0].closest('[data-sitekey]') || 
                           responses[0].closest('.g-recaptcha') ||
                           document.querySelector('[data-sitekey]');
          
          if (container) {
            const siteKey = container.getAttribute('data-sitekey');
            if (siteKey) {
              console.log('[DMCA] Found site key from container:', siteKey);
              resolve({ found: true, siteKey });
              return;
            }
          }
        }
        
        // Retry if not found yet
        if (attempts < maxAttempts) {
          await sleep(1000);
          checkCaptcha();
        } else {
          console.log('[DMCA] No captcha found after', maxAttempts, 'attempts');
          resolve({ found: false });
        }
      };
      
      checkCaptcha();
    });
    
    if (captchaInfo.alreadySolved) {
      showNotification('✅ DMCA filled. Captcha đã giải, có thể submit!');
      await autoSubmitDmca();
      return;
    }
    
    if (captchaInfo.found) {
      // Show notification asking user to click
      showNotification('⏸️ Vui lòng CLICK vào checkbox "I\'m not a robot" để tiếp tục...');
      console.log('[DMCA] Waiting for user to click reCAPTCHA checkbox...');
      
      // Close any existing challenge windows first (reset state)
      try {
        const existingChallenges = document.querySelectorAll('iframe[src*="bframe"]');
        console.log('[DMCA] Closing', existingChallenges.length, 'existing challenge frames');
        existingChallenges.forEach(frame => {
          try {
            frame.style.display = 'none';
            frame.remove();
          } catch {}
        });
      } catch {}
      
      // Wait a bit for DOM to settle
      await sleep(500);
      
      // Capture initial state AFTER cleanup
      const initialChallengeFrame = document.querySelector('iframe[src*="recaptcha/enterprise/bframe"], iframe[src*="recaptcha/api2/bframe"]');
      const initialCheckboxState = document.querySelector('#recaptcha-anchor')?.getAttribute('aria-checked');
      const initialTextareaValue = document.querySelector('textarea[name="g-recaptcha-response"]')?.value || '';
      
      console.log('[DMCA] Initial state:', {
        hasChallengeFrame: !!initialChallengeFrame,
        checkboxState: initialCheckboxState,
        hasToken: initialTextareaValue.length > 10
      });
      
      // Wait for user to click the checkbox (poll for STATE CHANGE)
      const waitForUserClick = async () => {
        return new Promise(async (resolve) => {
          let checkCount = 0;
          const maxChecks = 60; // Wait up to 60 seconds
          
          const checkInterval = setInterval(() => {
            checkCount++;
            
            // Method 1: Check for CHANGE in challenge frame (bframe appeared)
            const challengeFrame = document.querySelector('iframe[src*="recaptcha/enterprise/bframe"], iframe[src*="recaptcha/api2/bframe"]');
            const challengeAppeared = !initialChallengeFrame && challengeFrame;
            
            // Method 2: Check for CHANGE in checkbox state (unchecked → checked)
            const checkbox = document.querySelector('#recaptcha-anchor');
            const currentCheckboxState = checkbox?.getAttribute('aria-checked');
            const checkboxChanged = initialCheckboxState !== 'true' && currentCheckboxState === 'true';
            
            // Method 3: Check if NEW token appeared (wasn't there before)
            const currentTextarea = document.querySelector('textarea[name="g-recaptcha-response"]');
            const currentToken = currentTextarea?.value || '';
            const tokenAppeared = initialTextareaValue.length <= 10 && currentToken.length > 10;
            
            // Method 4: Check for NEW visible challenge elements (wasn't there in initial state)
            const challengeElements = document.querySelectorAll('.rc-imageselect-challenge, .rc-imageselect-payload, .rc-audiochallenge-tdownload-link');
            const challengeVisible = challengeElements.length > 0;
            
            // Method 5: Check if checkbox spinner is active (loading state = user just clicked)
            const spinner = document.querySelector('.recaptcha-checkbox-spinner, .recaptcha-checkbox-spinner-gif');
            const spinnerActive = spinner && window.getComputedStyle(spinner).opacity !== '0';
            
            console.log(`[DMCA] Check ${checkCount}/60:`, {
              challengeAppeared,
              checkboxChanged,
              tokenAppeared,
              challengeVisible,
              spinnerActive,
              currentCheckboxState,
              currentTokenLength: currentToken.length
            });
            
            // Only trigger if there's a REAL change
            if (challengeAppeared || checkboxChanged || tokenAppeared || challengeVisible || spinnerActive) {
              console.log('[DMCA] ✓ User action detected!');
              clearInterval(checkInterval);
              resolve(true);
              return;
            }
            
            if (checkCount >= maxChecks) {
              console.log('[DMCA] Timeout waiting for user click');
              clearInterval(checkInterval);
              resolve(false);
            }
          }, 1000);
        });
      };
      
      const userClicked = await waitForUserClick();
      
      if (!userClicked) {
        showNotification('⏱️ Timeout: Bạn chưa click checkbox. Vui lòng click và refresh lại.');
        autofillCompleted = true;
        setTimeout(() => stopAutofill(), 1000);
        return;
      }
      
      // Check if token already appeared (instant solve without challenge)
      const textareas = document.querySelectorAll('textarea[name="g-recaptcha-response"]');
      let instantSolved = false;
      for (const textarea of textareas) {
        if (textarea.value && textarea.value.length > 10) {
          instantSolved = true;
          console.log('[DMCA] ✓ Captcha instantly solved by Google!');
          break;
        }
      }
      
      if (instantSolved) {
        showNotification('✅ Captcha đã giải! Đang submit...');
        await sleep(rand(2000, 3000));
        await autoSubmitDmca();
        autofillCompleted = true;
        setTimeout(() => stopAutofill(), 1000);
        return;
      }
      
      // Wait for challenge iframe to fully load
      showNotification('🖼️ Vui lòng CHỌN HÌNH trong challenge reCAPTCHA...');
      await sleep(rand(2000, 3000));
      
      // Check if challenge frame exists
      const challengeFrame = document.querySelector('iframe[src*="recaptcha/enterprise/bframe"], iframe[src*="recaptcha/api2/bframe"]');
      if (!challengeFrame) {
        showNotification('❌ Không tìm thấy challenge frame. Vui lòng giải captcha thủ công.');
        autofillCompleted = true;
        setTimeout(() => stopAutofill(), 1000);
        return;
      }
      
      console.log('[DMCA] Challenge appeared, waiting for user to solve...');
      
      // Wait for user to solve the challenge (monitor for token appearance or challenge close)
      const waitForChallengeSolved = async () => {
        return new Promise(async (resolve) => {
          let checkCount = 0;
          const maxChecks = 120; // Wait up to 2 minutes
          
          const checkInterval = setInterval(() => {
            checkCount++;
            
            // Check if token appeared (user solved challenge)
            const currentTextarea = document.querySelector('textarea[name="g-recaptcha-response"]');
            const currentToken = currentTextarea?.value || '';
            const tokenSolved = currentToken.length > 10;
            
            // Check if challenge frame disappeared (closed)
            const currentChallengeFrame = document.querySelector('iframe[src*="bframe"]');
            const challengeClosed = !currentChallengeFrame;
            
            // Check if checkbox is now checked
            const checkbox = document.querySelector('#recaptcha-anchor');
            const isChecked = checkbox?.getAttribute('aria-checked') === 'true';
            
            if (checkCount % 10 === 0) {
              console.log(`[DMCA] Waiting for challenge solve... ${checkCount}/120:`, {
                tokenSolved,
                challengeClosed,
                isChecked,
                tokenLength: currentToken.length
              });
            }
            
            if (tokenSolved || (challengeClosed && isChecked)) {
              console.log('[DMCA] ✓ Challenge solved by user!');
              clearInterval(checkInterval);
              resolve(true);
              return;
            }
            
            if (checkCount >= maxChecks) {
              console.log('[DMCA] Timeout waiting for challenge solve');
              clearInterval(checkInterval);
              resolve(false);
            }
          }, 1000);
        });
      };
      
      const challengeSolved = await waitForChallengeSolved();
      
      if (!challengeSolved) {
        showNotification('⏱️ Timeout: Bạn chưa giải xong challenge. Vui lòng thử lại.');
        autofillCompleted = true;
        setTimeout(() => stopAutofill(), 1000);
        return;
      }
      
      showNotification('✅ Challenge đã giải! Đang submit...');
      await sleep(rand(2000, 3000));
      
      // Auto submit
      await autoSubmitDmca();
    } else {
      showNotification('✅ DMCA filled. Không tìm thấy captcha, có thể submit!');
    }
  } catch (e) {
    console.log('[DMCA] Captcha solve error:', e);
    showNotification('❌ Lỗi: ' + e.message);
  }
  
  // Đánh dấu hoàn tất
  autofillCompleted = true;
  setTimeout(() => stopAutofill(), 1000);
};

// Auto submit DMCA form
async function autoSubmitDmca() {
  try {
    // Wait and retry to check if button becomes enabled
    let submitButton = null;
    let attempts = 0;
    const maxAttempts = 10; // Increase from 5 to 10 attempts
    
    while (attempts < maxAttempts) {
      attempts++;
      await sleep(rand(2000, 3000));
      
      submitButton = document.querySelector('button[data-test-id="submit-button"]');
      if (submitButton) {
        const isDisabled = submitButton.disabled || submitButton.getAttribute('aria-disabled') === 'true';
        console.log(`[DMCA] Submit button check (attempt ${attempts}/${maxAttempts}):`, {
          disabled: submitButton.disabled,
          ariaDisabled: submitButton.getAttribute('aria-disabled'),
          classList: submitButton.className
        });
        
        if (!isDisabled) {
          console.log('[DMCA] Button is enabled!');
          break;
        } else {
          console.log('[DMCA] Button still disabled, waiting...');
        }
      }
    }
    
    if (submitButton) {
      console.log('[DMCA] Preparing to click submit button');
      
      // Force enable button anyway
      submitButton.disabled = false;
      submitButton.removeAttribute('disabled');
      submitButton.setAttribute('aria-disabled', 'false');
      
      try {
        submitButton.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } catch {}
      await sleep(rand(500, 1000));
      
      // Try multiple click methods
      console.log('[DMCA] Clicking submit button...');
      
      // Method 1: Direct click
      submitButton.click();
      
      // Method 2: Dispatch click event
      submitButton.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
      
      // Method 3: Dispatch pointer events
      submitButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      submitButton.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      
      console.log('[DMCA] Submit button clicked!');
      
      // Wait and check if form submitted
      await sleep(rand(1000, 2000));
      
      const newUrl = window.location.href;
      if (newUrl !== location.href || document.body.innerText.includes('Thank you') || 
          document.body.innerText.includes('submitted')) {
        showNotification('✅ Form đã submit thành công!');
      } else {
        showNotification('⚠️ Đã click Submit, vui lòng kiểm tra form');
      }
    } else {
      console.log('[DMCA] Submit button not found');
      showNotification('⚠️ Không tìm thấy nút Submit, hãy submit thủ công');
    }
  } catch (e) {
    console.log('[DMCA] Submit error:', e);
    showNotification('❌ Lỗi submit: ' + e.message);
  }
}

const handleGoogleSearchConsoleSpam = async (payload) => {
  await sleep(rand(600, 1200));

  const currentUrl = window.location.href;
  if (currentUrl.includes('accounts.google.com')) {
    showNotification('Cần đăng nhập Google trước (đang bị redirect sang trang login).');
    return;
  }

  const rawDomain = normText(payload.domain);
  const host = rawDomain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  const urlToReport = host ? `https://${host}` : '';

  const getPhase2Els = () => {
    // Try multiple strategies to find Phase 2 inputs
    let queryEl = null;
    let detailEl = null;
    
    // Strategy 1: By placeholder text (MOST RELIABLE - doesn't change)
    const allInputs = Array.from(document.querySelectorAll('input[jsname="YPqjbf"][type="text"]'));
    queryEl = allInputs.find(inp => {
      const placeholder = (inp.getAttribute('placeholder') || '').toLowerCase();
      return placeholder.includes('exact query') || 
             placeholder.includes('exact query that shows the problem') ||
             placeholder.includes('cụm từ');
    });
    
    const allTextareas = Array.from(document.querySelectorAll('textarea[jsname="YPqjbf"]'));
    detailEl = allTextareas.find(ta => {
      const placeholder = (ta.getAttribute('placeholder') || '').toLowerCase();
      return placeholder.includes('anything else') || 
             placeholder.includes('is there anything else') ||
             placeholder.includes('điều gì');
    });
    
    if (queryEl && detailEl) {
      console.log('✓ Found Phase 2 elements by placeholder:', {
        queryId: queryEl.id,
        detailId: detailEl.id
      });
      return { queryEl, detailEl };
    }
    
    // Strategy 2: By Material Design class + visibility check
    if (!queryEl) {
      const materialInputs = Array.from(document.querySelectorAll('input.VfPpkd-fmcmS-wGMbrd[type="text"]'));
      queryEl = materialInputs.find(inp => {
        const rect = inp.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0;
        const notUrlInput = !inp.getAttribute('type') || inp.getAttribute('type') !== 'url';
        return visible && notUrlInput;
      });
      console.log('Query input found by Material class:', !!queryEl);
    }
    
    if (!detailEl) {
      const materialTextareas = Array.from(document.querySelectorAll('textarea.VfPpkd-fmcmS-wGMbrd[maxlength="300"]'));
      detailEl = materialTextareas.find(ta => {
        const rect = ta.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      console.log('Detail textarea found by Material class:', !!detailEl);
    }
    
    if (queryEl && detailEl) {
      console.log('✓ Found Phase 2 elements by Material class');
      return { queryEl, detailEl };
    }
    
    // Strategy 3: By jsname="YPqjbf" + position (query is first, detail is second)
    if (!queryEl || !detailEl) {
      const allJsnameInputs = Array.from(document.querySelectorAll('input[jsname="YPqjbf"][type="text"]'));
      const allJsnameTextareas = Array.from(document.querySelectorAll('textarea[jsname="YPqjbf"]'));
      
      // Get visible ones only
      const visibleInputs = allJsnameInputs.filter(inp => {
        const rect = inp.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      
      const visibleTextareas = allJsnameTextareas.filter(ta => {
        const rect = ta.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      
      if (visibleInputs.length > 0 && !queryEl) {
        queryEl = visibleInputs[0]; // First visible input
        console.log('Query input found by position (first visible)');
      }
      
      if (visibleTextareas.length > 0 && !detailEl) {
        detailEl = visibleTextareas[0]; // First visible textarea
        console.log('Detail textarea found by position (first visible)');
      }
    }
    
    if (queryEl && detailEl) {
      console.log('✓ Found Phase 2 elements by position');
      return { queryEl, detailEl };
    }
    
    console.log('❌ Phase 2 elements search failed:', { 
      foundQuery: !!queryEl, 
      foundDetail: !!detailEl,
      availableInputs: document.querySelectorAll('input[jsname="YPqjbf"]').length,
      availableTextareas: document.querySelectorAll('textarea[jsname="YPqjbf"]').length
    });
    
    return { queryEl, detailEl };
  };

  const getOptionOther = () => {
    // Try multiple strategies to find "Other" option
    
    // Strategy 1: Find by jsname and class (most specific)
    const options = Array.from(document.querySelectorAll('li[role="option"][jsname="Fs2VSc"]'));
    const other = options.find((li) => {
      const t = normText(li.textContent || '').toLowerCase();
      return t === 'khác' || t.includes('khác') || t === 'other' || t.includes('other');
    });
    if (other) return other;
    
    // Strategy 2: Find by class MCs1Pd (Material Design list item)
    const materialOptions = Array.from(document.querySelectorAll('li.MCs1Pd[role="option"]'));
    const materialOther = materialOptions.find((li) => {
      const t = normText(li.textContent || '').toLowerCase();
      return t === 'khác' || t.includes('khác') || t === 'other' || t.includes('other');
    });
    if (materialOther) return materialOther;
    
    // Strategy 3: Find by aria-selected attribute
    const allOptions = Array.from(document.querySelectorAll('li[role="option"][aria-selected]'));
    return allOptions.find((li) => {
      const t = normText(li.textContent || '').toLowerCase();
      return t === 'khác' || t.includes('khác') || t === 'other' || t.includes('other');
    }) || null;
  };

  const clickButtonByText = (text) => {
    const targetText = text.toLowerCase();
    
    // Strategy 1: Find by VfPpkd-LgbsSe button class (Material Design filled button)
    const materialButtons = Array.from(document.querySelectorAll('button.VfPpkd-LgbsSe'));
    for (const btn of materialButtons) {
      const btnText = normText(btn.textContent || '').toLowerCase();
      const spanText = normText(btn.querySelector('span.VfPpkd-vQzf8d')?.textContent || '').toLowerCase();
      if (btnText === targetText || btnText.includes(targetText) || spanText === targetText || spanText.includes(targetText)) {
        try {
          btn.scrollIntoView({ block: 'center', inline: 'center' });
        } catch {}
        btn.click();
        console.log('✓ Clicked Material button:', btnText || spanText);
        return true;
      }
    }
    
    // Strategy 2: Find by jsname="EwKiCc" (the specific button identifier)
    const jsnameButtons = Array.from(document.querySelectorAll('button[jsname="EwKiCc"]'));
    for (const btn of jsnameButtons) {
      const btnText = normText(btn.textContent || '').toLowerCase();
      if (btnText === targetText || btnText.includes(targetText)) {
        try {
          btn.scrollIntoView({ block: 'center', inline: 'center' });
        } catch {}
        btn.click();
        console.log('✓ Clicked jsname button:', btnText);
        return true;
      }
    }
    
    // Strategy 3: Find Material Design button by VfPpkd-RLmnJb div (ripple effect)
    const rippleDivs = Array.from(document.querySelectorAll('div.VfPpkd-RLmnJb'));
    for (const rippleDiv of rippleDivs) {
      const btn = rippleDiv.closest('button');
      if (btn) {
        const btnText = normText(btn.textContent || '').toLowerCase();
        if (btnText === targetText || btnText.includes(targetText)) {
          try {
            btn.scrollIntoView({ block: 'center', inline: 'center' });
          } catch {}
          btn.click();
          console.log('✓ Clicked ripple button:', btnText);
          return true;
        }
      }
    }
    
    // Strategy 4: Standard text-based search
    const btn =
      findByText('button', (t) => t.toLowerCase() === targetText) ||
      findByText('button span', (t) => t.toLowerCase() === targetText)?.closest('button') ||
      null;
    if (btn) {
      try {
        btn.scrollIntoView({ block: 'center', inline: 'center' });
      } catch {}
      btn.click();
      console.log('✓ Clicked standard button');
      return true;
    }
    
    console.log('❌ Button not found:', text);
    return false;
  };

  const waitFor = async (fn, tries = 60, delayMs = 350) => {
    for (let i = 0; i < tries; i++) {
      if (fn()) return true;
      await sleep(delayMs);
    }
    return false;
  };

  const phase2Ready = () => {
    const els = getPhase2Els();
    return !!els.queryEl || !!els.detailEl;
  };

  if (!phase2Ready()) {
    const urlEl =
      document.querySelector('#c1') ||
      document.querySelector('input[type="url"][aria-label]') ||
      null;
    if (urlEl && urlToReport) {
      const cur = normText(urlEl.value);
      if (!cur || cur.length < 4) {
        await typeLikeHuman(urlEl, urlToReport);
        await sleep(rand(250, 700));
      }
    }

    await waitFor(() => !!getOptionOther() || !!findByText('button', (t) => t.toLowerCase() === 'tiếp tục' || t.toLowerCase() === 'continue'), 60, 350);

    const opt = getOptionOther();
    if (opt) {
      console.log('✓ Found "Other" option, clicking...');
      try {
        opt.scrollIntoView({ block: 'center', inline: 'center' });
      } catch {}
      await sleep(rand(120, 350));
      try {
        opt.click();
        console.log('✓ "Other" option clicked');
      } catch (e) {
        console.log('❌ Error clicking "Other" option:', e);
      }
    } else {
      console.log('❌ "Other" option not found');
    }

    await sleep(rand(500, 800));
    
    // Try to click Continue button with retry logic
    console.log('Attempting to click Continue button...');
    let continueClicked = false;
    
    // Try Vietnamese first
    continueClicked = clickButtonByText('Tiếp tục');
    
    // If failed, try English
    if (!continueClicked) {
      await sleep(rand(300, 500));
      continueClicked = clickButtonByText('Continue');
    }
    
    // If still failed, try lowercase
    if (!continueClicked) {
      await sleep(rand(300, 500));
      continueClicked = clickButtonByText('continue');
    }
    
    // Final fallback: Try to find button with specific class combination
    if (!continueClicked) {
      await sleep(rand(300, 500));
      console.log('Trying final fallback: finding button by class...');
      const finalBtn = document.querySelector('button.VfPpkd-LgbsSe[jsname="EwKiCc"]') ||
                       document.querySelector('button.VfPpkd-LgbsSe.nCP5yc.AjY5Oe') ||
                       document.querySelector('button[jscontroller="soHxf"]');
      if (finalBtn) {
        try {
          finalBtn.scrollIntoView({ block: 'center', inline: 'center' });
        } catch {}
        await sleep(rand(200, 400));
        finalBtn.click();
        continueClicked = true;
        console.log('✓ Continue button clicked via fallback');
      }
    }
    
    if (continueClicked) {
      console.log('✓ Continue button clicked successfully');
    } else {
      console.log('❌ Failed to click Continue button');
      showNotification('⚠️ Không tìm thấy nút Continue. Vui lòng bấm thủ công.');
    }

    await waitFor(
      () =>
        phase2Ready() ||
        !!findByText('button span', (t) => t.toLowerCase() === 'gửi')?.closest('button') ||
        !!document.querySelector('button[jsname="sFeBqf"]'),
      80,
      350,
    );
  }

  const q = normText(payload.queryPhrase || payload.query || host)
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '');
  const detail = normText(payload.reason).slice(0, 300);

  console.log('Waiting for Phase 2 fields...', { query: q, detail: detail });

  // Wait longer for Phase 2 to fully load
  await waitFor(() => {
    const els = getPhase2Els();
    console.log('Phase 2 check:', { hasQueryEl: !!els.queryEl, hasDetailEl: !!els.detailEl });
    return !!els.queryEl || !!els.detailEl;
  }, 80, 400);

  // Extra delay to ensure DOM is ready
  await sleep(rand(800, 1200));

  let { queryEl, detailEl } = getPhase2Els();
  console.log('Phase 2 elements found:', { 
    queryEl: queryEl ? queryEl.id || queryEl.className : 'NOT FOUND',
    detailEl: detailEl ? detailEl.id || detailEl.className : 'NOT FOUND' 
  });

  if (!queryEl || !detailEl) {
    console.log('❌ Phase 2 fields not found! Available inputs:', {
      allInputs: document.querySelectorAll('input[type="text"]').length,
      allTextareas: document.querySelectorAll('textarea').length
    });
    showNotification('⚠️ Không tìm thấy input fields ở Step 2. Vui lòng fill thủ công.');
    
    // Try one more time after longer delay
    await sleep(2000);
    ({ queryEl, detailEl } = getPhase2Els());
    
    if (!queryEl || !detailEl) {
      autofillCompleted = true;
      setTimeout(() => stopAutofill(), 1000);
      return;
    }
    console.log('✓ Found Phase 2 fields after retry');
  }

  showNotification('✓ Tìm thấy fields Step 2, đang fill...');

  // Fill query field
  if (queryEl && q) {
    console.log('Filling query field with:', q);
    try {
      queryEl.scrollIntoView({ block: 'center', inline: 'center' });
    } catch {}
    await sleep(rand(300, 500));
    await typeLikeHuman(queryEl, q);
    console.log('✓ Query field filled');
  } else {
    console.log('❌ Cannot fill query field:', { hasElement: !!queryEl, hasValue: !!q });
  }

  await sleep(rand(500, 1000));

  // Re-query elements in case DOM changed
  ({ queryEl, detailEl } = getPhase2Els());
  
  // Fill detail field
  if (detailEl && detail) {
    console.log('Filling detail field with:', detail.substring(0, 50) + '...');
    try {
      detailEl.scrollIntoView({ block: 'center', inline: 'center' });
    } catch {}
    await sleep(rand(300, 500));
    await typeLikeHuman(detailEl, detail);
    console.log('✓ Detail field filled');
  } else {
    console.log('❌ Cannot fill detail field:', { hasElement: !!detailEl, hasValue: !!detail });
  }

  await sleep(rand(300, 800));
  const shouldSubmit = payload.autoSubmit === true;
  if (shouldSubmit) {
    ({ queryEl, detailEl } = getPhase2Els());
    const filledOk =
      (!!queryEl && !!normText(queryEl.value)) && (!!detailEl && !!normText(detailEl.value));
    if (!filledOk) {
      await sleep(rand(500, 1100));
      ({ queryEl, detailEl } = getPhase2Els());
      const filledOk2 =
        (!!queryEl && !!normText(queryEl.value)) && (!!detailEl && !!normText(detailEl.value));
      if (!filledOk2) {
        showNotification('Google Spam: không fill được phase 2 nên không auto gửi. Bạn bấm Gửi tay.');
        return;
      }
    }
    // Try to click Submit button with multiple strategies
    console.log('Attempting to click Submit button...');
    let submitClicked = false;
    
    // Strategy 1: Try by jsname="sFeBqf" (specific submit button identifier)
    const submitByJsname = document.querySelector('button[jsname="sFeBqf"]');
    if (submitByJsname) {
      try {
        submitByJsname.scrollIntoView({ block: 'center', inline: 'center' });
      } catch {}
      await sleep(rand(300, 500));
      submitByJsname.click();
      submitClicked = true;
      console.log('✓ Submit clicked via jsname="sFeBqf"');
    }
    
    // Strategy 2: Try Vietnamese "Gửi"
    if (!submitClicked) {
      submitClicked = clickButtonByText('Gửi');
    }
    
    // Strategy 3: Try English "Submit"
    if (!submitClicked) {
      await sleep(rand(300, 500));
      submitClicked = clickButtonByText('Submit');
    }
    
    // Strategy 4: Try lowercase "submit"
    if (!submitClicked) {
      await sleep(rand(300, 500));
      submitClicked = clickButtonByText('submit');
    }
    
    showNotification(submitClicked ? '✅ Google Spam: đã bấm Submit!' : '⚠️ Google Spam: đã fill, không thấy nút Submit (hãy bấm tay).');
    
    // Đánh dấu hoàn tất
    autofillCompleted = true;
    setTimeout(() => stopAutofill(), 1000);
    return;
  }

  showNotification('✅ Google Spam filled. Hãy kiểm tra lại rồi bấm Gửi/Submit.');
  
  // Đánh dấu hoàn tất để dừng autofill
  autofillCompleted = true;
  setTimeout(() => stopAutofill(), 1000);
};

const handleGoogleSearchFeedback = async (payload) => {
  console.log('=== handleGoogleSearchFeedback START ===');
  console.log('Payload:', payload);
  console.log('Current URL:', window.location.href);
  
  await sleep(rand(800, 1500));

  const rawDomain = normText(payload.domain);
  let searchUrl = rawDomain;
  if (!/^https?:\/\//i.test(searchUrl)) {
    searchUrl = `https://${searchUrl}`;
  }

  let targetDomain = '';
  try {
    const url = new URL(searchUrl);
    targetDomain = url.hostname.toLowerCase();
  } catch {
    targetDomain = searchUrl.toLowerCase();
  }

  const reason = normText(payload.reason).slice(0, 500);

  console.log('Google Search Feedback: Starting flow', { searchUrl, targetDomain });
  
  const findResultsSelector = () => {
    const checks = [
      { selector: 'div.g', validate: (els) => els.some(el => el.querySelector('cite, a[href]')) },
      { selector: '#rso > div', validate: (els) => els.some(el => el.querySelector('cite')) },
      { selector: 'div[data-ved]', validate: (els) => els.filter(el => el.querySelector('cite')).length > 3 },
    ];
    
    for (const check of checks) {
      const els = Array.from(document.querySelectorAll(check.selector));
      const valid = check.validate(els);
      console.log(`Checking ${check.selector}:`, els.length, 'valid:', valid);
      if (valid && els.length > 3) {
        const resultsWithCite = els.filter(el => el.querySelector('cite'));
        console.log(`  → ${resultsWithCite.length} have <cite> tags`);
        return { selector: check.selector, count: resultsWithCite.length };
      }
    }
    return { selector: 'div.g', count: 0 };
  };
  
  const resultsInfo = findResultsSelector();
  let resultsSelector = resultsInfo.selector;
  const isSearchPage = window.location.href.includes('/search?q=') || window.location.href.includes('&q=');
  const hasResults = resultsInfo.count > 5 && isSearchPage;
  console.log('Has search results already?', hasResults, `(${resultsInfo.count} results with ${resultsSelector})`);

  if (!hasResults) {
    console.log('No results yet, need to search first');
    showNotification('Google Search: Đang tìm ô search...');

    await sleep(rand(1000, 2000));

    const searchInputSelectors = [
      'textarea#APjFqb',
      'textarea.gLFyf',
      'textarea[jsname="yZiJbe"]',
      'input[name="q"]',
      'textarea[name="q"]',
      'input[title="Tìm kiếm"]',
      'textarea[title="Tìm kiếm"]',
      'textarea[aria-label="Tìm kiếm"]',
    ];

    console.log('Looking for search input...');
    let searchInput = null;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      console.log(`Search input attempt ${attempt + 1}...`);
      for (const selector of searchInputSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const rect = el.getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0;
          const style = window.getComputedStyle(el);
          const actuallyVisible = visible && 
                                 style.display !== 'none' && 
                                 style.visibility !== 'hidden' &&
                                 style.opacity !== '0';
          
          console.log(`  ${selector}:`, {
            exists: true,
            visible,
            actuallyVisible,
            width: rect.width,
            height: rect.height
          });
          
          if (actuallyVisible) {
            searchInput = el;
            console.log('✓ Found search input:', selector);
            break;
          }
        } else {
          console.log(`  ${selector}: not found`);
        }
      }
      
      if (searchInput) break;
      await sleep(1000);
    }

    if (!searchInput) {
      console.error('❌ Search input not found after 3 attempts!');
      showNotification('❌ Không tìm thấy ô tìm kiếm Google');
      throw new Error('Search input not found');
    }
    
    console.log('✓ Search input ready:', searchInput.tagName, searchInput.id || searchInput.className);

    try {
      searchInput.scrollIntoView({ block: 'center', inline: 'center' });
    } catch {}
    await sleep(rand(300, 600));

    await typeLikeHuman(searchInput, searchUrl);
    await sleep(rand(500, 800));

    const submitBtn = document.querySelector('button[type="submit"]') ||
                      document.querySelector('input[type="submit"]');
    if (submitBtn) {
      submitBtn.click();
    } else {
      searchInput.form?.submit?.();
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true });
      searchInput.dispatchEvent(enterEvent);
    }

    showNotification('Google Search: Đã submit, đang chờ kết quả...');
    console.log('Search submitted, waiting for results...');

    const waitForResults = async () => {
      for (let i = 0; i < 80; i++) {
        const info = findResultsSelector();
        console.log(`Waiting for results... attempt ${i}: ${info.count} results`);
        if (info.count > 5) {
          return info.selector;
        }
        await sleep(500);
      }
      return null;
    };

    const newSelector = await waitForResults();
    if (!newSelector) {
      showNotification('❌ Không có kết quả tìm kiếm');
      return;
    }
    
    resultsSelector = newSelector;
    console.log('Search results loaded! Using selector:', resultsSelector);
    await sleep(rand(1000, 2000));
  } else {
    console.log('Already on search results page, skip searching');
    showNotification('✓ Đã có kết quả, bắt đầu scan...');
  }

  const unwrapGoogleUrl = (url) => {
    try {
      if (url.includes('google.com/url?q=')) {
        const parsed = new URL(url);
        return parsed.searchParams.get('q') || url;
      }
    } catch {}
    return url;
  };

  const extractDomain = (url) => {
    try {
      const unwrapped = unwrapGoogleUrl(url);
      const parsed = new URL(unwrapped);
      return parsed.hostname.toLowerCase();
    } catch {
      return '';
    }
  };

  const isDomainMatch = (resultDomain, target) => {
    if (!resultDomain || !target) return false;
    if (resultDomain === target) return true;
    if (resultDomain.endsWith(`.${target}`)) return true;
    return false;
  };

  let allResults = Array.from(document.querySelectorAll(resultsSelector));
  const resultsWithCite = allResults.filter(r => r.querySelector('cite'));
  const results = resultsWithCite.length > 0 ? resultsWithCite : allResults;
  
  console.log(`Found ${allResults.length} total elements, ${resultsWithCite.length} have cite tags`);
  console.log(`Scanning ${results.length} results with selector: ${resultsSelector}`);
  
  let matchedIndex = -1;
  let matchedDomain = '';
  let matchedResult = null;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    
    let resultDomain = '';
    let href = '';

    const cite = result.querySelector('cite');
    if (cite) {
      const citeText = normText(cite.textContent);
      console.log(`Result ${i} cite:`, citeText);
      try {
        const cleanText = citeText.replace(/ › .*$/, '').trim();
        const url = new URL(cleanText.startsWith('http') ? cleanText : `https://${cleanText}`);
        resultDomain = url.hostname.toLowerCase();
      } catch {
        resultDomain = citeText.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(' ')[0];
      }
      console.log(`  → Extracted domain:`, resultDomain);
    }

    if (!resultDomain) {
      const link = result.querySelector('a[href]');
      if (link) {
        href = link.getAttribute('href') || '';
        resultDomain = extractDomain(href);
        console.log(`Result ${i} link domain:`, resultDomain);
      }
    }

    if (resultDomain && isDomainMatch(resultDomain, targetDomain)) {
      matchedIndex = i;
      matchedDomain = resultDomain;
      matchedResult = result;
      console.log('✓ MATCHED! Result', i, ':', { domain: resultDomain, target: targetDomain });
      break;
    }
  }

  if (!matchedResult) {
    showNotification(`❌ Không tìm thấy domain ${targetDomain} trong kết quả`);
    console.log('NOT_FOUND_ON_GOOGLE:', targetDomain);
    return;
  }

  showNotification(`✓ Tìm thấy domain tại kết quả #${matchedIndex + 1}`);
  await sleep(rand(800, 1500));

  try {
    matchedResult.scrollIntoView({ block: 'center', inline: 'center' });
  } catch {}
  await sleep(rand(300, 600));

  const threeDotsButton = matchedResult.querySelector('div[role="button"][data-ved], button[aria-label*="Thêm"], [jscontroller="gSZvdb"]');
  let menuOpened = false;

  if (threeDotsButton) {
    try {
      threeDotsButton.scrollIntoView({ block: 'center' });
    } catch {}
    await sleep(rand(200, 400));
    threeDotsButton.click();
    menuOpened = true;
    console.log('Three dots button clicked (specific)');
  } else {
    const svgPath = matchedResult.querySelector('svg path[d*="M12 8c1.1"]');
    if (svgPath) {
      const btn = svgPath.closest('[role="button"]') || svgPath.closest('div[jscontroller]');
      if (btn) {
        try {
          btn.scrollIntoView({ block: 'center' });
        } catch {}
        await sleep(rand(200, 400));
        btn.click();
        menuOpened = true;
        console.log('Three dots button clicked (via SVG)');
      }
    }
  }

  if (!menuOpened) {
    const allButtons = matchedResult.querySelectorAll('[role="button"]');
    for (const btn of allButtons) {
      const svg = btn.querySelector('svg');
      if (svg) {
        const pathD = svg.querySelector('path')?.getAttribute('d') || '';
        if (pathD.includes('M12 8c1.1') || pathD.includes('c1.1 0 2-.9')) {
          try {
            btn.scrollIntoView({ block: 'center' });
          } catch {}
          await sleep(rand(200, 400));
          btn.click();
          menuOpened = true;
          console.log('Three dots button clicked (path match)');
          break;
        }
      }
    }
  }

  if (!menuOpened) {
    showNotification('❌ Không tìm thấy nút menu (3 chấm)');
    console.log('Available buttons in result:', matchedResult.querySelectorAll('[role="button"]').length);
    return;
  }

  await sleep(rand(1200, 2000));

  const findFeedbackBtn = () => {
    const feedbackSelectors = [
      'div[jscontroller="gSZvdb"] .BZQEXe[aria-label*="Phản hồi"]',
      'div[jscontroller="gSZvdb"][role="button"]',
      'div.mWcf0e[role="button"]',
      'div.VfL2Y .BZQEXe',
    ];
    
    for (const selector of feedbackSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = normText(el.textContent || el.getAttribute('aria-label') || '').toLowerCase();
        if (text.includes('phản hồi') || text.includes('feedback')) {
          return el;
        }
      }
    }

    const allElements = Array.from(document.querySelectorAll('div[role="button"], button, [jscontroller="gSZvdb"]'));
    const feedbackTexts = ['phản hồi', 'feedback'];
    return allElements.find((el) => {
      const text = normText(el.textContent).toLowerCase();
      const ariaLabel = normText(el.getAttribute('aria-label') || '').toLowerCase();
      return feedbackTexts.some((t) => text.includes(t) || ariaLabel.includes(t));
    }) || null;
  };

  const feedbackBtn = findFeedbackBtn();
  if (!feedbackBtn) {
    showNotification('❌ Không tìm thấy nút Phản hồi (Feedback)');
    console.log('Available menu items:', document.querySelectorAll('[role="button"]').length);
    return;
  }

  try {
    feedbackBtn.scrollIntoView({ block: 'center' });
  } catch {}
  await sleep(rand(300, 600));
  feedbackBtn.click();
  console.log('Feedback button clicked:', feedbackBtn.className);
  showNotification('✓ Đã mở modal Phản hồi');

  await sleep(rand(1500, 2500));

  const clickOtherReasonFirst = () => {
    const selectors = [
      'div[jsname="zANgVc"][role="button"]',
      'div.CTbprd.Kd2ZMe[jsname="zANgVc"]',
      'div[jsaction*="h5M12e"]',
    ];

    for (const selector of selectors) {
      const items = Array.from(document.querySelectorAll(selector));
      const otherBtn = items.find((el) => {
        const text = normText(el.textContent).toLowerCase();
        return text.includes('lý do khác') || text === 'khác';
      });
      if (otherBtn) {
        try {
          otherBtn.scrollIntoView({ block: 'center' });
        } catch {}
        otherBtn.click();
        console.log('Clicked "Lý do khác" button (first step)');
        return true;
      }
    }
    return false;
  };

  const clicked = clickOtherReasonFirst();
  if (!clicked) {
    console.log('Could not find "Lý do khác" button');
  }

  await sleep(rand(800, 1500));

  const selectOtherReasonRadio = () => {
    const radioSelectors = [
      'div[jsname="QyaNXb"][role="radio"]',
      'div.CbGnWe[role="radio"]',
      'div[role="radio"][jsaction*="h5M12e"]',
    ];

    for (const selector of radioSelectors) {
      const radios = Array.from(document.querySelectorAll(selector));
      const otherRadio = radios.find((el) => {
        const text = normText(el.textContent).toLowerCase();
        return text.includes('lý do khác') || text === 'khác';
      });
      if (otherRadio) {
        try {
          otherRadio.scrollIntoView({ block: 'center' });
        } catch {}
        otherRadio.click();
        console.log('Selected "Lý do khác" radio (second step)');
        return true;
      }
    }
    return false;
  };

  const selected = selectOtherReasonRadio();
  if (!selected) {
    console.log('Could not find "Lý do khác" radio button');
  }

  await sleep(rand(800, 1500));

  const findTextarea = () => {
    const selectors = [
      'textarea[jsname="B7I4Od"]',
      'textarea.S9imif',
      'textarea[aria-label*="Mô tả"]',
      'textarea[placeholder*="bắt buộc"]',
      'textarea[maxlength="500"]',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && !el.disabled) {
        return el;
      }
    }

    const textareas = Array.from(document.querySelectorAll('textarea'));
    return textareas.find((t) => {
      const rect = t.getBoundingClientRect();
      return rect.width > 10 && rect.height > 10 && !t.disabled;
    }) || null;
  };

  const textarea = findTextarea();
  if (textarea && reason) {
    try {
      textarea.scrollIntoView({ block: 'center' });
    } catch {}
    await sleep(rand(300, 600));
    await typeLikeHuman(textarea, reason);
    console.log('Filled feedback textarea:', textarea.className);
  } else {
    console.log('Textarea not found or no reason provided');
  }

  await sleep(rand(800, 1500));

  const findSubmitButton = () => {
    const selectors = [
      'div[jsname="q00WCc"][role="button"]',
      'div.qgIH8c[role="button"]',
      'div[jsaction*="TSjZEc"][role="button"]',
    ];

    for (const selector of selectors) {
      const btns = Array.from(document.querySelectorAll(selector));
      const submitBtn = btns.find((btn) => {
        const text = normText(btn.textContent).toLowerCase();
        return text === 'gửi' || text === 'submit';
      });
      if (submitBtn) return submitBtn;
    }

    const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
    return allButtons.find((btn) => {
      const text = normText(btn.textContent).toLowerCase();
      return text === 'gửi' || text === 'submit' || text === 'send';
    }) || null;
  };

  const submitBtn2 = findSubmitButton();
  if (submitBtn2 && submitBtn2.getAttribute('aria-disabled') !== 'true') {
    try {
      submitBtn2.scrollIntoView({ block: 'center' });
    } catch {}
    await sleep(rand(300, 600));
    submitBtn2.click();
    console.log('Submit button clicked:', submitBtn2.className);
    showNotification('✓ Đã gửi phản hồi Google Search');
  } else {
    showNotification('⚠️ Đã fill xong, hãy bấm nút Gửi thủ công');
    console.log('Submit button not found or disabled');
  }
  
  // Đánh dấu hoàn tất để dừng autofill
  autofillCompleted = true;
  setTimeout(() => stopAutofill(), 1000);
};

const handleGoogleSafeBrowsingReportPhish = async (payload) => {
  await sleep(rand(600, 1200));

  const rawDomain = normText(payload.domain);
  const host = rawDomain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  const urlToReport = normText(payload.urlToReport) || (host ? `https://${host}` : '');
  const details = normText(payload.reason).slice(0, 800);

  const threatTypeText = normText(payload.safeBrowsingThreatType) || 'Tấn công phi kỹ thuật';
  const threatCategoryText = normText(payload.safeBrowsingThreatCategory) || 'Lừa đảo qua mạng xã hội';

  const waitFor = async (fn, tries = 60, delayMs = 350) => {
    for (let i = 0; i < tries; i++) {
      if (fn()) return true;
      await sleep(delayMs);
    }
    return false;
  };

  const clickMatSelectAndChoose = async (selectEl, optionText) => {
    if (!selectEl) return false;
    try {
      selectEl.scrollIntoView({ block: 'center', inline: 'center' });
    } catch {}
    await sleep(rand(80, 220));
    try {
      selectEl.click();
    } catch {
      return false;
    }

    const option = await (async () => {
      await waitFor(() => {
        const opts = Array.from(document.querySelectorAll('mat-option, [role="option"]'));
        return opts.some((n) => normText(n.textContent).toLowerCase().includes(optionText.toLowerCase()));
      }, 50, 200);
      const opts = Array.from(document.querySelectorAll('mat-option, [role="option"]'));
      return (
        opts.find((n) => normText(n.textContent).toLowerCase().includes(optionText.toLowerCase())) || null
      );
    })();

    if (!option) return false;
    try {
      option.scrollIntoView({ block: 'center', inline: 'center' });
    } catch {}
    await sleep(rand(80, 220));
    try {
      option.click();
    } catch {
      return false;
    }
    return true;
  };

  const l1 = document.querySelector('mat-select[formcontrolname="l1Taxonomy"]');
  await clickMatSelectAndChoose(l1, threatTypeText);
  await sleep(rand(250, 650));

  const l3 = document.querySelector('mat-select[formcontrolname="l3Taxonomy"]');
  await clickMatSelectAndChoose(l3, threatCategoryText);
  await sleep(rand(250, 650));

  const urlEl = document.querySelector('input[formcontrolname="url"]');
  if (urlEl && urlToReport) await typeLikeHuman(urlEl, urlToReport);
  await sleep(rand(250, 650));

  const detailsEl = document.querySelector('textarea[formcontrolname="details"]');
  if (detailsEl && details) await typeLikeHuman(detailsEl, details);

  await sleep(rand(500, 1000));

  // 🔥 Click "Tiếp tục" button nếu có (step 1 → step 2)
  const continueBtn = 
    findByText('button', (t) => t.toLowerCase() === 'tiếp tục' || t.toLowerCase() === 'continue' || t.toLowerCase() === 'next') ||
    findByText('button span', (t) => t.toLowerCase() === 'tiếp tục' || t.toLowerCase() === 'continue')?.closest('button');
  
  if (continueBtn) {
    try {
      continueBtn.scrollIntoView({ block: 'center', inline: 'center' });
    } catch {}
    await sleep(rand(300, 600));
    continueBtn.click();
    console.log('Clicked "Tiếp tục" button');
    showNotification('🔄 Đã click Tiếp tục, đang đợi form step 2...');
    
    // Đợi form step 2 xuất hiện
    await sleep(rand(2000, 3000));
  }

  // 🔥 LUÔN AUTO SUBMIT (step 2)
  const hasUrl = !!urlEl && !!normText(urlEl.value);
  const submitBtn =
    findByText('button', (t) => t.toLowerCase() === 'gửi' || t.toLowerCase() === 'submit') ||
    findByText('button span', (t) => t.toLowerCase() === 'gửi' || t.toLowerCase() === 'submit')?.closest('button') ||
    document.querySelector('button[type="submit"]') ||
    null;

  if (!hasUrl) {
    showNotification('⚠️ Safe Browsing: Chưa fill được URL, không thể submit');
    autofillCompleted = true;
    setTimeout(() => stopAutofill(), 1000);
    return;
  }
  
  if (submitBtn) {
    try {
      submitBtn.scrollIntoView({ block: 'center', inline: 'center' });
    } catch {}
    await sleep(rand(300, 600));
    submitBtn.click();
    showNotification('✅ Safe Browsing: Đã fill và tự động submit! (Check reCAPTCHA nếu có)');
  } else {
    showNotification('⚠️ Safe Browsing: Đã fill xong nhưng không tìm thấy nút Submit');
  }
  
  // Đánh dấu hoàn tất để dừng autofill
  autofillCompleted = true;
  setTimeout(() => stopAutofill(), 1000);
};

const fillFormGeneric = (data) => {
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
    showNotification(`✅ Auto-filled ${filled} field(s). Please complete captcha and submit.`);
  } else {
    showNotification('⚠️ Could not auto-fill fields. Please fill manually.');
  }
  
  // Đánh dấu hoàn tất để dừng autofill
  autofillCompleted = true;
  setTimeout(() => stopAutofill(), 1000);
};

const fillForm = async (data) => {
  const payload = data || {};
  const url = window.location.href;

  console.log('fillForm called, URL:', url);
  
  if (url.includes('www.google.com/search') || 
      (url.includes('www.google.com') && (url.includes('?hl=') || url.includes('&hl=')))) {
    console.log('→ Routing to handleGoogleSearchFeedback');
    await handleGoogleSearchFeedback(payload);
    return;
  }
  if (url.includes('search.google.com/search-console/report-spam')) {
    await handleGoogleSearchConsoleSpam(payload);
    return;
  }
  if (url.includes('safebrowsing.google.com/safebrowsing/report_phish')) {
    await handleGoogleSafeBrowsingReportPhish(payload);
    return;
  }
  if (url.includes('abuse.cloudflare.com/registrar_whois')) {
    await handleCloudflareRegistrarWhois(payload);
    return;
  }
  if (url.includes('abuse.cloudflare.com/threat')) {
    await handleCloudflareThreat(payload);
    return;
  }
  if (url.includes('abuse.radix.website')) {
    await handleRadixAbuse(payload);
    return;
  }
  if (url.includes('reportcontent.google.com/forms/dmca_search')) {
    await handleGoogleDmca(payload);
    return;
  }

  fillFormGeneric(payload);
};

let autofillState = null;
let autofillObserver = null;
let autofillRunning = false;
let autofillPending = false;
let autofillLastAttemptAt = 0;
let autofillAttemptCount = 0;
let autofillCompleted = false;

const stopAutofill = () => {
  autofillState = null;
  autofillPending = false;
  autofillRunning = false;
  autofillCompleted = false;
  autofillAttemptCount = 0;
  if (autofillObserver) {
    try {
      autofillObserver.disconnect();
    } catch {}
  }
  autofillObserver = null;
};

const runAutofill = async () => {
  if (!autofillState) return;
  if (autofillCompleted) {
    stopAutofill();
    return;
  }
  if (Date.now() > autofillState.until) {
    console.log('⏱️ Autofill timeout reached, stopping');
    stopAutofill();
    return;
  }
  if (autofillRunning) {
    autofillPending = true;
    return;
  }
  
  // Giới hạn số lần thử để tránh spam
  if (autofillAttemptCount >= 5) {
    console.log('✋ Max autofill attempts reached (5), stopping to avoid spam');
    showNotification('Auto-fill hoàn tất. Vui lòng kiểm tra và submit thủ công.');
    autofillCompleted = true;
    stopAutofill();
    return;
  }
  
  if (Date.now() - autofillLastAttemptAt < 1500) return; // Tăng delay từ 650ms → 1.5s
  
  autofillLastAttemptAt = Date.now();
  autofillAttemptCount++;
  autofillRunning = true;
  
  console.log(`🔄 Autofill attempt ${autofillAttemptCount}/5`);
  
  try {
    await fillForm(autofillState.payload);
    
    // Sau khi fill xong, đợi 3s rồi dừng hẳn (không fill lại nữa)
    setTimeout(() => {
      if (autofillAttemptCount >= 2) {
        console.log('✅ Autofill completed after', autofillAttemptCount, 'attempts');
        autofillCompleted = true;
        stopAutofill();
      }
    }, 3000);
    
  } finally {
    autofillRunning = false;
    if (autofillPending && !autofillCompleted) {
      autofillPending = false;
      setTimeout(() => runAutofill(), 1000);
    }
  }
};

const scheduleAutofill = (payload) => {
  // Reset counters
  autofillAttemptCount = 0;
  autofillCompleted = false;
  
  autofillState = { payload, until: Date.now() + 30_000 }; // Giảm từ 90s → 30s
  try {
    chrome.runtime.sendMessage({ action: 'setTabPayload', payload });
  } catch {}
  if (!autofillObserver) {
    autofillObserver = new MutationObserver(() => {
      if (!autofillCompleted) {
        runAutofill();
      }
    });
    try {
      autofillObserver.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true,
      });
    } catch {}
  }
  runAutofill();
  setTimeout(() => {
    if (!autofillCompleted) {
      console.log('⏱️ Auto-stop after 30s');
      stopAutofill();
    }
  }, 30_000); // Giảm từ 95s → 30s
};

const tryRestorePayloadFromBackground = () =>
  new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ action: 'getTabPayload' }, (resp) => {
        resolve(resp?.payload || null);
      });
    } catch {
      resolve(null);
    }
  });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    scheduleAutofill(request.data);
    Promise.resolve().then(() => sendResponse({ success: true }));
  }
  return true;
});

const detectPage = () => {
  const url = window.location.href;
  const supported = [
    'www.google.com',
    'search.google.com/search-console/report-spam',
    'safebrowsing.google.com/safebrowsing/report_phish',
    'reportcontent.google.com/forms',
    'abuse.cloudflare.com',
    'abuse.radix.website',
  ];

  if (supported.some((pattern) => url.includes(pattern))) {
    console.log('Domain Abuse Reporter: Supported page detected');
    showNotification('Page detected! Extension ready for auto-fill.');
    const payload = getPayloadFromHash() || getPayloadFromWindowName();
    if (payload) scheduleAutofill(payload);
    else {
      tryRestorePayloadFromBackground().then((restored) => {
        if (restored) scheduleAutofill(restored);
      });
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', detectPage);
} else {
  detectPage();
}

window.addEventListener('message', (event) => {
  if (event.data.type === 'FILL_REPORT_FORM') {
    scheduleAutofill(event.data.payload);
  }
});

console.log('Domain Abuse Reporter Extension: Content script loaded');
