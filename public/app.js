// FRIDAY front-end: device-local sign-in, then chat.
// NOTE: this sign-in is a beginner-friendly demo (stored on this device only),
// not production auth. The real secret (Groq key) lives on the server.

const $ = (id) => document.getElementById(id);
const authScreen = $("auth");
const chatScreen = $("chat");

const USER_KEY = "friday_user";
const history = []; // {role, content} sent to the model

function currentUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
  catch { return null; }
}

function showChat(user) {
  authScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  $("greeting").textContent = `· hi, ${user.name}`;
  if (!$("messages").children.length) {
    addMessage("friday", `Hello ${user.name}. I'm FRIDAY. What can I do for you?`);
  }
  $("msg").focus();
}

/* ---------- sign in ---------- */
$("authForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("name").value.trim();
  const pass = $("pass").value;
  if (!name || !pass) return;

  const saved = currentUser();
  if (saved && saved.name.toLowerCase() === name.toLowerCase()) {
    if (saved.pass !== pass) { $("authMsg").textContent = "Wrong passcode for this name."; return; }
    showChat(saved);
  } else {
    const user = { name, pass };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    $("authMsg").textContent = "";
    showChat(user);
  }
});

$("signout").addEventListener("click", () => {
  chatScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
  $("messages").innerHTML = "";
  history.length = 0;
  $("pass").value = "";
});

$("clear").addEventListener("click", () => {
  $("messages").innerHTML = "";
  history.length = 0;
  const u = currentUser();
  if (u) addMessage("friday", `Fresh start, ${u.name}. What's next?`);
});

/* ---------- rendering ---------- */
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// very small, safe markdown: escape first, then format.
function renderMarkdown(text) {
  let t = escapeHtml(text);
  t = t.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // bullet lists
  t = t.replace(/(?:^|\n)(?:[-*] .+(?:\n|$))+/g, (block) => {
    const items = block.trim().split("\n").map((l) => `<li>${l.replace(/^[-*]\s+/, "")}</li>`).join("");
    return `<ul>${items}</ul>`;
  });
  // paragraphs from remaining double newlines
  t = t.split(/\n{2,}/).map((p) => (/^<(ul|pre)/.test(p.trim()) ? p : `<p>${p.replace(/\n/g, "<br>")}</p>`)).join("");
  return t;
}

function addMessage(who, text) {
  const row = document.createElement("div");
  row.className = `row ${who === "me" ? "me" : "friday"}`;

  const avatar = document.createElement("div");
  avatar.className = `avatar ${who === "me" ? "me" : "friday"}`;
  const u = currentUser();
  avatar.textContent = who === "me" ? (u?.name?.[0]?.toUpperCase() || "U") : "";

  const bubble = document.createElement("div");
  bubble.className = `bubble ${who}`;
  if (who === "me") bubble.textContent = text;
  else bubble.innerHTML = renderMarkdown(text);

  row.append(avatar, bubble);
  $("messages").appendChild(row);
  $("messages").scrollTop = $("messages").scrollHeight;
  return { row, bubble };
}

function addTyping() {
  const row = document.createElement("div");
  row.className = "row friday";
  row.innerHTML = `<div class="avatar friday"></div><div class="bubble friday"><span class="typing"><span></span><span></span><span></span></span></div>`;
  $("messages").appendChild(row);
  $("messages").scrollTop = $("messages").scrollHeight;
  return row;
}

/* ---------- chat ---------- */
const textarea = $("msg");
textarea.addEventListener("input", () => {
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 140) + "px";
});
textarea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("chatForm").requestSubmit(); }
});

$("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = textarea.value.trim();
  if (!text) return;
  textarea.value = "";
  textarea.style.height = "auto";
  addMessage("me", text);
  history.push({ role: "user", content: text });

  const typing = addTyping();
  $("sendBtn").disabled = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    const data = await res.json();
    typing.remove();
    if (!res.ok) { addMessage("error", "⚠ " + (data.error || "Something went wrong.")); return; }
    addMessage("friday", data.reply);
    history.push({ role: "assistant", content: data.reply });
  } catch (err) {
    typing.remove();
    addMessage("error", "⚠ Could not reach the server. Is it running?");
  } finally {
    $("sendBtn").disabled = false;
    textarea.focus();
  }
});

// auto-resume if already signed in on this device
const u = currentUser();
if (u) showChat(u);
