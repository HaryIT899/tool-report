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
  const lastName = normText(payload.lastName);
  const company = normText(payload.company);
  const signature = normText(payload.signature);
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

  await typeIf(findInputByAriaContains('input', ['first name', 'tên']), firstName);
  await sleep(rand(400, 1100));
  await typeIf(findInputByAriaContains('input', ['last name', 'họ']), lastName);
  await sleep(rand(400, 1100));
  await typeIf(findInputByAriaContains('input', ['company name', 'company']), company);
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

  await typeIf(findInputByAriaContains('input', ['signature', 'chữ ký']), signature);

  showNotification('✅ DMCA filled. Hãy tự review, tick checkbox nếu có, rồi submit.');
  
  // Đánh dấu hoàn tất để dừng autofill
  autofillCompleted = true;
  setTimeout(() => stopAutofill(), 1000);
};

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
    const queryEl =
      document.querySelector('input[jsname="YPqjbf"][type="text"][placeholder*="Cụm từ tìm kiếm" i]') ||
      document.querySelector('input[jsname="YPqjbf"][type="text"][aria-label*="Cụm từ tìm kiếm" i]') ||
      document.querySelector('#c301') ||
      document.querySelector('input[placeholder*="Cụm từ tìm kiếm" i]') ||
      document.querySelector('input[aria-label*="Cụm từ tìm kiếm" i]') ||
      null;
    const detailEl =
      document.querySelector('textarea[jsname="YPqjbf"][placeholder*="Có điều gì khác" i]') ||
      document.querySelector('textarea[jsname="YPqjbf"][aria-label*="Có điều gì khác" i]') ||
      document.querySelector('#c305') ||
      document.querySelector('textarea[placeholder*="Có điều gì khác" i]') ||
      document.querySelector('textarea[aria-label*="Có điều gì khác" i]') ||
      null;
    return { queryEl, detailEl };
  };

  const getOptionOther = () => {
    const options = Array.from(document.querySelectorAll('li[role="option"][jsname="Fs2VSc"]'));
    const other = options.find((li) => {
      const t = normText(li.textContent || '').toLowerCase();
      return t === 'khác' || t.includes('khác');
    });
    return other || null;
  };

  const clickButtonByText = (text) => {
    const btn =
      findByText('button', (t) => t.toLowerCase() === text.toLowerCase()) ||
      findByText('button span', (t) => t.toLowerCase() === text.toLowerCase())?.closest('button') ||
      null;
    if (btn) {
      btn.click();
      return true;
    }
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

    await waitFor(() => !!getOptionOther() || !!findByText('button', (t) => t.toLowerCase() === 'tiếp tục'), 60, 350);

    const opt = getOptionOther();
    if (opt) {
      try {
        opt.scrollIntoView({ block: 'center', inline: 'center' });
      } catch {}
      await sleep(rand(120, 350));
      try {
        opt.click();
      } catch {}
    }

    await sleep(rand(250, 600));
    clickButtonByText('Tiếp tục');

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

  await waitFor(() => {
    const els = getPhase2Els();
    return !!els.queryEl || !!els.detailEl;
  }, 60, 350);

  let { queryEl, detailEl } = getPhase2Els();
  if (queryEl && q) await typeLikeHuman(queryEl, q);
  await sleep(rand(300, 800));
  ({ queryEl, detailEl } = getPhase2Els());
  if (detailEl && detail) await typeLikeHuman(detailEl, detail);

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
    const ok = clickButtonByText('Gửi');
    showNotification(ok ? 'Google Spam: đã bấm Gửi.' : 'Google Spam: đã fill, không thấy nút Gửi (hãy bấm tay).');
    return;
  }

  showNotification('✅ Google Spam filled. Hãy kiểm tra lại rồi bấm Gửi.');
  
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
