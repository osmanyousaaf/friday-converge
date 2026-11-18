// FRIDAY front-end: a simple device-local sign-in, then chat.
// NOTE: this sign-in is a beginner-friendly demo (stored on this device only),
// not production authentication. The real secret (Groq key) lives on the server.

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
    addBubble("friday", `Hello ${user.name}. I'm FRIDAY. What can I do for you?`);
  }
  $("msg").focus();
}

// --- sign in ---
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

// --- chat ---
function addBubble(who, text) {
  const div = document.createElement("div");
  div.className = `bubble ${who}`;
  div.textContent = text;
  $("messages").appendChild(div);
  $("messages").scrollTop = $("messages").scrollHeight;
  return div;
}

$("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("msg");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  addBubble("me", text);
  history.push({ role: "user", content: text });

  const typing = addBubble("friday typing", "FRIDAY is thinking…");
  $("sendBtn").disabled = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    const data = await res.json();
    typing.remove();
    if (!res.ok) { addBubble("friday", "⚠ " + (data.error || "Something went wrong.")); return; }
    addBubble("friday", data.reply);
    history.push({ role: "assistant", content: data.reply });
  } catch (err) {
    typing.remove();
    addBubble("friday", "⚠ Could not reach the server. Is it running?");
  } finally {
    $("sendBtn").disabled = false;
    input.focus();
  }
});

// auto-resume if already signed in on this device
const u = currentUser();
if (u) showChat(u);
