const API_ROOT = window.location.port === "5000" ? "/api" : "http://localhost:5000/api";
const form = document.getElementById("authForm");
const nameField = document.getElementById("nameField");
const modeButton = document.getElementById("toggleMode");
const message = document.getElementById("authMessage");
let registerMode = false;

function renderMode() {
  document.getElementById("authTitle").textContent = registerMode ? "Create account" : "Sign in";
  document.getElementById("authSubtitle").textContent = registerMode ? "Create a QuickServe account to track orders." : "Access your account and order history.";
  document.getElementById("submitButton").textContent = registerMode ? "Create account" : "Sign in";
  modeButton.textContent = registerMode ? "Already have an account? Sign in" : "Create an account";
  nameField.hidden = !registerMode;
}

modeButton.addEventListener("click", () => { registerMode = !registerMode; renderMode(); });
form.addEventListener("submit", async event => {
  event.preventDefault();
  message.textContent = "";
  const endpoint = registerMode ? "/auth/register" : "/auth/login";
  const payload = { email: document.getElementById("email").value, password: document.getElementById("password").value };
  if (registerMode) payload.name = document.getElementById("name").value;
  try {
    const response = await fetch(`${API_ROOT}${endpoint}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to authenticate");
    localStorage.setItem("quickserveToken", result.data.token);
    window.location.href = result.data.user.role === "admin" ? "admin.html" : "index.html";
  } catch (error) {
    message.textContent = error.message;
  }
});
renderMode();
