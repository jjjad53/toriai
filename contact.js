var GAS_URL = 'https://script.google.com/macros/s/AKfycby0sGxXqDuSagHSiwapu38yRhtjnE7THRKp4lLiR8E0aAkLnxuXuy0i1t1hFq6NVAQMIg/exec';

function getContactFormPayload() {
  return {
    name: ((document.getElementById('contactName') || {}).value || '').trim(),
    subject: ((document.getElementById('contactSubject') || {}).value || '').trim(),
    message: ((document.getElementById('contactMessage') || {}).value || '').trim()
  };
}

function showContactStatus(msg, type) {
  var el = document.getElementById('contactStatus');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';

  if (type === 'success') {
    el.style.background = '#f0fdf4';
    el.style.border = '1px solid #86efac';
    el.style.color = '#15803d';
    return;
  }
  if (type === 'error') {
    el.style.background = '#fff1f2';
    el.style.border = '1px solid #fca5a5';
    el.style.color = '#b91c1c';
    return;
  }

  el.style.background = '#f8f8fc';
  el.style.border = '1px solid #e0e0ea';
  el.style.color = '#5a5a78';
}

function setContactSubmitting(isSubmitting) {
  var submitBtn = document.getElementById('contactSubmitBtn');
  if (!submitBtn) return;
  submitBtn.disabled = !!isSubmitting;
  submitBtn.textContent = isSubmitting ? '送信中...' : '送信する';
}

function submitContactForm(event) {
  if (event) event.preventDefault();

  var payload = getContactFormPayload();
  if (!payload.name || !payload.subject || !payload.message) {
    showContactStatus('すべての項目を入力してください。', 'error');
    return;
  }
  if (!GAS_URL || GAS_URL === 'YOUR_GAS_URL_HERE') {
    showContactStatus('お問い合わせ送信先が設定されていません。', 'error');
    return;
  }

  setContactSubmitting(true);
  showContactStatus('送信しています。しばらくお待ちください。', 'info');

  var callbackName = '__toriaiContactCallback_' + Date.now();
  var cleanup = function() {
    try { delete window[callbackName]; } catch (_) {}
    var script = document.getElementById(callbackName);
    if (script && script.parentNode) script.parentNode.removeChild(script);
  };

  var timeout = setTimeout(function() {
    cleanup();
    setContactSubmitting(false);
    showContactStatus('送信に失敗しました。Apps Script の再デプロイ状態をご確認ください。', 'error');
  }, 12000);

  window[callbackName] = function(result) {
    clearTimeout(timeout);
    cleanup();
    setContactSubmitting(false);
    if (!result || result.status !== 'ok') {
      showContactStatus('送信に失敗しました。もう一度お試しください。', 'error');
      return;
    }
    showContactStatus('送信しました。ご意見ありがとうございます。', 'success');
    var form = document.getElementById('contactForm');
    if (form) form.reset();
  };

  var params = [
    'callback=' + encodeURIComponent(callbackName),
    'name=' + encodeURIComponent(payload.name),
    'subject=' + encodeURIComponent(payload.subject),
    'message=' + encodeURIComponent(payload.message)
  ];

  var script = document.createElement('script');
  script.id = callbackName;
  script.src = GAS_URL + '?' + params.join('&');
  script.onerror = function() {
    clearTimeout(timeout);
    cleanup();
    setContactSubmitting(false);
    showContactStatus('送信に失敗しました。接続状態をご確認ください。', 'error');
  };
  document.body.appendChild(script);
}

(function styleContactUi() {
  function applyStyle() {
    var btn = document.getElementById('contactSubmitBtn');
    if (btn) {
      btn.style.background = '#ffffff';
      btn.style.color = '#1a1a2e';
      btn.style.border = '1px solid #d4d4dc';
      btn.style.borderRadius = '10px';
      btn.style.fontWeight = '700';
      btn.style.boxShadow = 'none';
    }

    var penLabel = document.querySelector('.contact-pen-label');
    if (penLabel) {
      penLabel.style.fontFamily = "'Space Grotesk','Noto Sans JP',sans-serif";
      penLabel.style.fontWeight = '800';
      penLabel.style.letterSpacing = '.08em';
      penLabel.style.color = '#1a1a2e';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyStyle, { once: true });
  } else {
    applyStyle();
  }
})();
