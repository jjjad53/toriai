var GAS_URL = 'https://script.google.com/macros/s/AKfycby0sGxXqDuSagHSiwapu38yRhtjnE7THRKp4lLiR8E0aAkLnxuXuy0i1t1hFq6NVAQMIg/exec';

function getContactFormPayload() {
  return {
    name: ((document.getElementById('contactName') || {}).value || '').trim(),
    subject: ((document.getElementById('contactSubject') || {}).value || '').trim(),
    message: ((document.getElementById('contactMessage') || {}).value || '').trim()
  };
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

  var submitBtn = document.getElementById('contactSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';
  }
  showContactStatus('送信しています。しばらくお待ちください。', 'info');

  fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(function() {
      showContactStatus('送信しました。ご意見ありがとうございます。', 'success');
      var form = document.getElementById('contactForm');
      if (form) form.reset();
    })
    .catch(function(err) {
      console.error('Contact form error:', err);
      showContactStatus('送信に失敗しました。時間をおいて再度お試しください。', 'error');
    })
    .finally(function() {
      if (!submitBtn) return;
      submitBtn.disabled = false;
      submitBtn.textContent = '送信する';
    });
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
