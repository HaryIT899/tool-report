document.addEventListener('DOMContentLoaded', () => {
  const domainInput = document.getElementById('domain');
  const reasonInput = document.getElementById('reason');
  const emailInput = document.getElementById('email');
  const fillBtn = document.getElementById('fillBtn');
  const statusDiv = document.getElementById('status');

  chrome.storage.local.get(['lastDomain', 'lastReason', 'lastEmail'], (result) => {
    if (result.lastDomain) domainInput.value = result.lastDomain;
    if (result.lastReason) reasonInput.value = result.lastReason;
    if (result.lastEmail) emailInput.value = result.lastEmail;
  });

  fillBtn.addEventListener('click', async () => {
    const domain = domainInput.value.trim();
    const reason = reasonInput.value.trim();
    const email = emailInput.value.trim();

    if (!domain || !reason) {
      showStatus('Please fill domain and reason fields', false);
      return;
    }

    chrome.storage.local.set({
      lastDomain: domain,
      lastReason: reason,
      lastEmail: email,
    });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(
      tab.id,
      {
        action: 'fillForm',
        data: { domain, reason, email },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          showStatus('Error: ' + chrome.runtime.lastError.message, false);
        } else {
          showStatus('Form filled successfully!', true);
        }
      }
    );
  });

  const showStatus = (message, isSuccess) => {
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    statusDiv.className = isSuccess ? 'status success' : 'status';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  };
});
