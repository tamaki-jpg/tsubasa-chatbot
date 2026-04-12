/**
 * つばさ社会保険労務士事務所 チャットボット ウィジェット
 * 使い方: <script src="chatbot_widget.js" data-api="https://your-server.com"></script>
 */
(function () {
  // ===== 設定 =====
  const API_URL = (document.currentScript && document.currentScript.getAttribute("data-api"))
    || "http://localhost:5000";

  const PRIMARY_COLOR = "#1a6fad";   // つばさカラー（青系）
  const BOT_NAME = "つばさアシスタント";
  const GREETING = "こんにちは！つばさ社会保険労務士事務所のAIアシスタントです。\nストレスチェック制度やサービスについてお気軽にご質問ください😊";

  let chatHistory = [];
  let isOpen = false;

  // ===== スタイル注入 =====
  const style = document.createElement("style");
  style.textContent = `
    #tsubasa-chat-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${PRIMARY_COLOR};
      color: #fff;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      font-size: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9998;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #tsubasa-chat-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);
    }
    #tsubasa-chat-window {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 360px;
      max-width: calc(100vw - 48px);
      height: 520px;
      max-height: calc(100vh - 120px);
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      z-index: 9999;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif;
      font-size: 14px;
      transition: opacity 0.2s, transform 0.2s;
    }
    #tsubasa-chat-window.hidden {
      opacity: 0;
      transform: translateY(16px) scale(0.97);
      pointer-events: none;
    }
    #tsubasa-chat-header {
      background: ${PRIMARY_COLOR};
      color: #fff;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    #tsubasa-chat-header .avatar {
      width: 34px;
      height: 34px;
      background: rgba(255,255,255,0.25);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    #tsubasa-chat-header .title { flex: 1; }
    #tsubasa-chat-header .name { font-weight: bold; font-size: 15px; }
    #tsubasa-chat-header .subtitle { font-size: 11px; opacity: 0.85; margin-top: 1px; }
    #tsubasa-chat-header .close-btn {
      background: none; border: none; color: #fff;
      cursor: pointer; font-size: 20px; padding: 4px; line-height: 1;
      opacity: 0.8;
    }
    #tsubasa-chat-header .close-btn:hover { opacity: 1; }
    #tsubasa-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #f6f8fb;
    }
    .tsubasa-msg {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .tsubasa-msg.user { flex-direction: row-reverse; }
    .tsubasa-msg .bubble {
      max-width: 78%;
      padding: 10px 14px;
      border-radius: 16px;
      line-height: 1.55;
      word-break: break-word;
      white-space: pre-wrap;
    }
    .tsubasa-msg.bot .bubble {
      background: #fff;
      color: #222;
      border-radius: 4px 16px 16px 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }
    .tsubasa-msg.user .bubble {
      background: ${PRIMARY_COLOR};
      color: #fff;
      border-radius: 16px 4px 16px 16px;
    }
    .tsubasa-msg .icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: ${PRIMARY_COLOR};
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    .tsubasa-typing .bubble {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
    }
    .tsubasa-typing .dot {
      width: 7px; height: 7px;
      background: #aaa; border-radius: 50%;
      animation: tsubasa-bounce 1.2s infinite;
    }
    .tsubasa-typing .dot:nth-child(2) { animation-delay: 0.2s; }
    .tsubasa-typing .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes tsubasa-bounce {
      0%,60%,100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }
    #tsubasa-chat-input-area {
      padding: 10px 12px;
      border-top: 1px solid #e8ecf0;
      display: flex;
      gap: 8px;
      flex-shrink: 0;
      background: #fff;
    }
    #tsubasa-chat-input {
      flex: 1;
      border: 1px solid #dde2e8;
      border-radius: 22px;
      padding: 9px 16px;
      font-size: 14px;
      outline: none;
      resize: none;
      font-family: inherit;
      line-height: 1.4;
      max-height: 100px;
      overflow-y: auto;
    }
    #tsubasa-chat-input:focus { border-color: ${PRIMARY_COLOR}; }
    #tsubasa-chat-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${PRIMARY_COLOR};
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    #tsubasa-chat-send:hover { background: #155a8a; }
    #tsubasa-chat-send:disabled { background: #b0c4d8; cursor: not-allowed; }
  `;
  document.head.appendChild(style);

  // ===== HTML構築 =====
  const btn = document.createElement("button");
  btn.id = "tsubasa-chat-btn";
  btn.innerHTML = "💬";
  btn.title = BOT_NAME;

  const win = document.createElement("div");
  win.id = "tsubasa-chat-window";
  win.classList.add("hidden");
  win.innerHTML = `
    <div id="tsubasa-chat-header">
      <div class="avatar">🦅</div>
      <div class="title">
        <div class="name">${BOT_NAME}</div>
        <div class="subtitle">つばさ社会保険労務士事務所</div>
      </div>
      <button class="close-btn" id="tsubasa-close-btn">×</button>
    </div>
    <div id="tsubasa-chat-messages"></div>
    <div id="tsubasa-chat-input-area">
      <textarea id="tsubasa-chat-input" placeholder="質問を入力してください..." rows="1"></textarea>
      <button id="tsubasa-chat-send">➤</button>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(win);

  const messagesEl = document.getElementById("tsubasa-chat-messages");
  const inputEl = document.getElementById("tsubasa-chat-input");
  const sendBtn = document.getElementById("tsubasa-chat-send");

  // ===== メッセージ追加 =====
  function addMessage(role, text) {
    const div = document.createElement("div");
    div.className = `tsubasa-msg ${role}`;
    if (role === "bot") {
      div.innerHTML = `<div class="icon">🦅</div><div class="bubble">${escapeHtml(text)}</div>`;
    } else {
      div.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "tsubasa-msg bot tsubasa-typing";
    div.id = "tsubasa-typing-indicator";
    div.innerHTML = `<div class="icon">🦅</div><div class="bubble"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById("tsubasa-typing-indicator");
    if (el) el.remove();
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/\n/g, "<br>");
  }

  // ===== 送信処理 =====
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = "";
    inputEl.style.height = "auto";
    sendBtn.disabled = true;
    addMessage("user", text);
    chatHistory.push({ role: "user", content: text });
    showTyping();

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: chatHistory.slice(-10) }),
      });
      const data = await res.json();
      removeTyping();
      const reply = data.reply || data.error || "エラーが発生しました。";
      addMessage("bot", reply);
      chatHistory.push({ role: "assistant", content: reply });
    } catch (e) {
      removeTyping();
      addMessage("bot", "通信エラーが発生しました。しばらくしてからお試しください。");
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  // ===== チャット開閉 =====
  function openChat() {
    isOpen = true;
    win.classList.remove("hidden");
    btn.innerHTML = "✕";
    if (messagesEl.children.length === 0) {
      addMessage("bot", GREETING);
    }
    setTimeout(() => inputEl.focus(), 200);
  }

  function closeChat() {
    isOpen = false;
    win.classList.add("hidden");
    btn.innerHTML = "💬";
  }

  btn.addEventListener("click", () => isOpen ? closeChat() : openChat());
  document.getElementById("tsubasa-close-btn").addEventListener("click", closeChat);

  // ===== 10秒後に自動オープン（PCのみ） =====
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
  if (!isMobile) {
    setTimeout(() => {
      if (!isOpen) openChat();
    }, 10000);
  }

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // テキストエリア自動リサイズ
  inputEl.addEventListener("input", () => {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + "px";
  });
})();
