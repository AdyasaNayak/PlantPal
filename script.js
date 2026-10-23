// The deployed backend is the default. Locally (or when the backend itself
// serves the site) requests go to localhost instead.
const backendUrl =
  window.PLANTPAL_BACKEND_URL ||
  (["localhost", "127.0.0.1"].includes(location.hostname)
    ? "http://localhost:5000"
    : "https://plantpal-backend-dpjw.onrender.com");

// Only the most recent turns are sent to the server to keep requests small.
const MAX_CHAT_HISTORY = 12;

const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.querySelector(".theme-icon");
const homeButton = document.getElementById("homeButton");

const landingPage = document.querySelector(".landing-page");
const appLayout = document.querySelector(".app");
const pages = {
  home: landingPage,
  ask: appLayout,
  "my-plants": document.getElementById("myPlantsPage"),
  diagnose: document.getElementById("diagnosePage"),
  find: document.getElementById("findPlantPage"),
  care: document.getElementById("careGuidePage"),
  watering: document.getElementById("wateringPage"),
  "pet-safety": document.getElementById("petSafetyPage"),
};

const navItems = document.querySelectorAll(".nav-item[data-route]");

const chatForm = document.getElementById("chatForm");
const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const chatHistory = [];

const finderCarousel = document.getElementById("finderCarousel");
const finderPrevButton = document.getElementById("finderPrevButton");
const finderNextButton = document.getElementById("finderNextButton");
const plantPhotoInput = document.getElementById("plantPhotoInput");
const plantPreview = document.getElementById("plantPreview");
const plantResult = document.getElementById("plantResult");
const identifyPlantButton = document.getElementById("identifyPlantButton");

const CHAT_GREETING =
  "Hi! I'm PlantPal. Ask me anything about your house plants.";

/* Auth state ------------------------------------ */

const signInButton = document.getElementById("signInButton");
const signOutButton = document.getElementById("signOutButton");
const userChip = document.getElementById("userChip");
const authOverlay = document.getElementById("authOverlay");
const authClose = document.getElementById("authClose");
const signInTab = document.getElementById("signInTab");
const signUpTab = document.getElementById("signUpTab");
const signInForm = document.getElementById("signInForm");
const signUpForm = document.getElementById("signUpForm");

let authToken = localStorage.getItem("plantpal-token");
let authUser = null;

const signInEmail = document.getElementById("signInEmail");
const signInPassword = document.getElementById("signInPassword");
const signUpName = document.getElementById("signUpName");
const signUpEmail = document.getElementById("signUpEmail");
const signUpPassword = document.getElementById("signUpPassword");
const plantNameInput = document.getElementById("plantNameInput");
const plantSpeciesInput = document.getElementById("plantSpeciesInput");
const plantIntervalInput = document.getElementById("plantIntervalInput");
const plantNotesInput = document.getElementById("plantNotesInput");
const savePlantNameInput = document.getElementById("savePlantNameInput");
const savePlantIntervalInput = document.getElementById("savePlantIntervalInput");

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${backendUrl}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    const error = new Error(data.error || "Something went wrong.");
    error.status = response.status;
    throw error;
  }

  return data;
}

function setAuth(token, user) {
  authToken = token;
  authUser = user;

  if (token) {
    localStorage.setItem("plantpal-token", token);
  } else {
    localStorage.removeItem("plantpal-token");
  }
}

async function refreshAuth() {
  if (!authToken) {
    authUser = null;
    updateAuthUi();
    return;
  }

  try {
    const data = await api("/api/auth/me");
    authUser = data.user;
  } catch (error) {
    if (error.status === 401) {
      setAuth(null, null);
    }
  }

  updateAuthUi();
}

function updateAuthUi() {
  signInButton.classList.toggle("hidden", Boolean(authUser));
  signOutButton.classList.toggle("hidden", !authUser);
  userChip.classList.toggle("hidden", !authUser);
  userChip.textContent = authUser ? authUser.name : "";

  conversationBar.classList.toggle("hidden", !authUser);
  chatSaveHint.classList.toggle("hidden", Boolean(authUser));

  plantsSignedOut.classList.toggle("hidden", Boolean(authUser));
  plantsContent.classList.toggle("hidden", !authUser);
  addPlantButton.classList.toggle("hidden", !authUser);

  if (authUser) {
    loadPlants();
    loadConversations();
  } else {
    showSignedOutPlants();
    resetChat();
    loadConversations();
  }
}

/* Auth modal ------------------------------------- */

function openAuthModal() {
  authOverlay.classList.remove("hidden");
  selectAuthTab("sign-in");
  closeSidebar();
}

function closeAuthModal() {
  authOverlay.classList.add("hidden");
  clearFormErrors();
}

function selectAuthTab(tab) {
  const signInActive = tab === "sign-in";

  signInTab.classList.toggle("active", signInActive);
  signUpTab.classList.toggle("active", !signInActive);
  signInForm.classList.toggle("hidden", !signInActive);
  signUpForm.classList.toggle("hidden", signInActive);
  clearFormErrors();
}

function clearFormErrors() {
  ["signInError", "signUpError"].forEach(function (id) {
    const element = document.getElementById(id);
    element.textContent = "";
    element.classList.add("hidden");
  });
}

function showFormError(id, message) {
  const element = document.getElementById(id);
  element.textContent = message;
  element.classList.remove("hidden");
}

signInButton.addEventListener("click", openAuthModal);

document.addEventListener("click", function (event) {
  if (event.target.closest("[data-auth-open]")) {
    openAuthModal();
  }
});

authClose.addEventListener("click", closeAuthModal);
authOverlay.addEventListener("click", function (event) {
  if (event.target === authOverlay) {
    closeAuthModal();
  }
});

signInTab.addEventListener("click", function () {
  selectAuthTab("sign-in");
});

signUpTab.addEventListener("click", function () {
  selectAuthTab("sign-up");
});

signInForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const submitButton = signInForm.querySelector("button[type='submit']");
  submitButton.disabled = true;

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: {
        email: signInEmail.value,
        password: signInPassword.value,
      },
    });

    setAuth(data.token, data.user);
    signInForm.reset();
    closeAuthModal();
    updateAuthUi();
  } catch (error) {
    showFormError("signInError", error.message);
  } finally {
    submitButton.disabled = false;
  }
});

signUpForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const submitButton = signUpForm.querySelector("button[type='submit']");
  submitButton.disabled = true;

  try {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: {
        name: signUpName.value,
        email: signUpEmail.value,
        password: signUpPassword.value,
      },
    });

    setAuth(data.token, data.user);
    signUpForm.reset();
    closeAuthModal();
    updateAuthUi();
  } catch (error) {
    showFormError("signUpError", error.message);
  } finally {
    submitButton.disabled = false;
  }
});

signOutButton.addEventListener("click", async function () {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (error) {
    // The token is cleared below regardless; a failed logout call
    // shouldn't keep the user signed in locally.
  }

  setAuth(null, null);
  updateAuthUi();
});

/* Theme ---------------------------------------- */

function applyTheme(theme) {
  const isDark = theme === "dark";

  document.body.classList.toggle("dark-mode", isDark);
  themeIcon.textContent = isDark ? "☼" : "◐";
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode",
  );
  localStorage.setItem("plantpal-theme", theme);
}

applyTheme(localStorage.getItem("plantpal-theme") === "dark" ? "dark" : "light");

themeToggle.addEventListener("click", function () {
  const isDark = document.body.classList.contains("dark-mode");
  applyTheme(isDark ? "light" : "dark");
});

/* Routing -------------------------------------- */

function showRoute(route) {
  const page = pages[route];

  if (!page) {
    return;
  }

  Object.values(pages).forEach(function (pageElement) {
    pageElement.classList.add("hidden");
  });

  page.classList.remove("hidden");
  homeButton.classList.toggle("hidden", route === "home");

  navItems.forEach(function (item) {
    item.classList.toggle("active", item.dataset.route === route);
  });

  if (route === "my-plants" && authUser) {
    loadPlants();
  }

  closeSidebar();
}

// Every "go to page" button in the app just carries a data-route attribute.
document.addEventListener("click", function (event) {
  const routeButton = event.target.closest("[data-route]");

  if (routeButton) {
    showRoute(routeButton.dataset.route);
  }
});

/* Sidebar drawer -------------------------------- */

function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("visible");
  menuButton.classList.add("open");
  menuButton.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("visible");
  menuButton.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
}

menuButton.addEventListener("click", function () {
  if (sidebar.classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

sidebarOverlay.addEventListener("click", closeSidebar);

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeSidebar();

    if (!authOverlay.classList.contains("hidden")) {
      closeAuthModal();
    }
  }
});

/* Chat ------------------------------------------ */

const conversationBar = document.getElementById("conversationBar");
const conversationSelect = document.getElementById("conversationSelect");
const newConversationButton = document.getElementById("newConversationButton");
const deleteConversationButton = document.getElementById(
  "deleteConversationButton",
);
const chatSaveHint = document.getElementById("chatSaveHint");

let currentConversationId = null;
let conversationsCache = [];

function resetChat() {
  chatHistory.length = 0;
  currentConversationId = null;
  chatMessages.innerHTML = "";
  addMessage(CHAT_GREETING, "bot");
}

function addMessage(text, sender) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", sender);
  messageElement.textContent = text;

  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingMessage() {
  const typingElement = document.createElement("div");
  typingElement.classList.add("message", "bot", "typing");
  typingElement.textContent = "PlantPal is thinking";

  chatMessages.appendChild(typingElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingMessage() {
  const typingElement = chatMessages.querySelector(".typing");

  if (typingElement) {
    typingElement.remove();
  }
}

async function loadConversations() {
  if (!authUser) {
    conversationsCache = [];
    renderConversationOptions();
    return;
  }

  try {
    const data = await api("/api/conversations");
    conversationsCache = data.conversations;
  } catch (error) {
    conversationsCache = [];
  }

  renderConversationOptions();
}

function renderConversationOptions() {
  conversationSelect.innerHTML = "";

  const newOption = document.createElement("option");
  newOption.value = "";
  newOption.textContent = "— New chat —";
  conversationSelect.appendChild(newOption);

  conversationsCache.forEach(function (conversation) {
    const option = document.createElement("option");
    option.value = conversation.id;
    option.textContent = conversation.title;
    conversationSelect.appendChild(option);
  });

  conversationSelect.value =
    currentConversationId === null ? "" : String(currentConversationId);
  deleteConversationButton.disabled = currentConversationId === null;
}

conversationSelect.addEventListener("change", async function () {
  const id = Number(conversationSelect.value);

  if (!id) {
    resetChat();
    renderConversationOptions();
    return;
  }

  try {
    const data = await api(`/api/conversations/${id}`);
    currentConversationId = id;

    chatHistory.length = 0;
    chatMessages.innerHTML = "";

    data.messages.forEach(function (message) {
      addMessage(message.content, message.role === "user" ? "user" : "bot");
      chatHistory.push({ role: message.role, content: message.content });
    });

    renderConversationOptions();
  } catch (error) {
    addMessage("I couldn't load that conversation.", "bot");
  }
});

newConversationButton.addEventListener("click", function () {
  resetChat();
  renderConversationOptions();
  userInput.focus();
});

deleteConversationButton.addEventListener("click", async function () {
  if (currentConversationId === null) {
    return;
  }

  try {
    await api(`/api/conversations/${currentConversationId}`, {
      method: "DELETE",
    });
    resetChat();
    await loadConversations();
  } catch (error) {
    addMessage("I couldn't delete that conversation.", "bot");
  }
});

chatForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const message = userInput.value.trim();

  if (message === "") {
    return;
  }

  addMessage(message, "user");
  userInput.value = "";
  chatForm.querySelector("button").disabled = true;

  chatHistory.push({
    role: "user",
    content: message,
  });

  showTypingMessage();

  try {
    const response = await api("/api/chat", {
      method: "POST",
      body: {
        messages: chatHistory.slice(-MAX_CHAT_HISTORY),
        ...(authUser ? { conversationId: currentConversationId } : {}),
      },
    });

    removeTypingMessage();

    const reply =
      response.reply || "Sorry, I got an empty response. Please try again.";
    addMessage(reply, "bot");
    chatHistory.push({
      role: "assistant",
      content: reply,
    });

    if (authUser && response.conversationId) {
      currentConversationId = response.conversationId;
      await loadConversations();
    }
  } catch (error) {
    removeTypingMessage();

    if (error.status === 503) {
      addMessage(
        "PlantPal isn't connected to an AI provider yet. Please check back soon.",
        "bot",
      );
    } else {
      addMessage("Sorry, something went wrong. Please try again.", "bot");
    }
  } finally {
    chatForm.querySelector("button").disabled = false;
    userInput.focus();
  }
});

/* My Plants -------------------------------------- */

const plantsSignedOut = document.getElementById("plantsSignedOut");
const plantsContent = document.getElementById("plantsContent");
const plantsGrid = document.getElementById("plantsGrid");
const plantsEmpty = document.getElementById("plantsEmpty");
const plantDetail = document.getElementById("plantDetail");
const addPlantButton = document.getElementById("addPlantButton");
const addPlantForm = document.getElementById("addPlantForm");
const cancelAddPlant = document.getElementById("cancelAddPlant");

let plantsCache = [];
let selectedPlantId = null;
let detailRefreshing = false;

function wateringLabel(plant) {
  if (!plant.nextWaterDue) {
    return { text: "No watering logged yet", tone: "" };
  }

  const due = new Date(plant.nextWaterDue);
  const days = Math.round((due.getTime() - Date.now()) / 86400000);

  if (days < 0) {
    return {
      text: `Water now — overdue by ${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"}`,
      tone: "overdue",
    };
  }
  if (days === 0) {
    return { text: "Water today", tone: "due" };
  }
  return { text: `Water in ${days} ${days === 1 ? "day" : "days"}`, tone: "" };
}

function formatDate(value) {
  return new Date(value + "Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CARE_EVENT_LABELS = {
  water: "Watered",
  fertilize: "Fertilized",
  repot: "Repotted",
  prune: "Pruned",
  other: "Care note",
};

async function loadPlants() {
  if (!authUser) {
    return;
  }

  try {
    const data = await api("/api/plants");
    plantsCache = data.plants;
    renderPlantsGrid();
  } catch (error) {
    if (error.status === 401) {
      setAuth(null, null);
      updateAuthUi();
    }
  }
}

function renderPlantsGrid() {
  plantsGrid.innerHTML = "";
  plantsGrid.classList.toggle("hidden", selectedPlantId !== null);

  const showEmpty = plantsCache.length === 0 && selectedPlantId === null;
  plantsEmpty.classList.toggle("hidden", !showEmpty);

  plantsCache.forEach(function (plant) {
    const task = wateringLabel(plant);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "plant-card";
    card.dataset.plantId = plant.id;

    card.innerHTML = `
      <span class="plant-card-name">${escapeHtml(plant.name)}</span>
      ${plant.species ? `<span class="plant-card-species">${escapeHtml(plant.species)}</span>` : ""}
      <span class="plant-card-task ${task.tone}">${escapeHtml(task.text)}</span>
    `;

    card.addEventListener("click", function () {
      openPlant(plant.id);
    });

    plantsGrid.appendChild(card);
  });
}

async function openPlant(id) {
  try {
    const data = await api(`/api/plants/${id}`);
    selectedPlantId = id;

    plantsGrid.classList.add("hidden");
    plantsEmpty.classList.add("hidden");
    renderPlantDetail(data.plant, data.events);
  } catch (error) {
    if (error.status === 404) {
      await loadPlants();
    }
  }
}

function renderPlantDetail(plant, events) {
  const task = wateringLabel(plant);

  plantDetail.innerHTML = `
    <button type="button" class="link-button plant-back" id="plantBackButton">← All plants</button>
    <div class="plant-detail-header">
      <div>
        <h2>${escapeHtml(plant.name)}</h2>
        ${plant.species ? `<p class="plant-detail-species">${escapeHtml(plant.species)}</p>` : ""}
      </div>
      <div class="plant-detail-actions">
        <button type="button" class="button-primary" id="waterNowButton">💧 Water now</button>
        <button type="button" class="button-secondary plant-delete" id="deletePlantButton">Remove</button>
      </div>
    </div>

    <div class="plant-detail-grid">
      <div class="plant-detail-main">
        ${
          plant.image
            ? `<img class="plant-detail-photo" src="${escapeHtml(plant.image)}" alt="Photo of ${escapeHtml(plant.name)}" />`
            : ""
        }

        <div class="plant-task-card ${task.tone}">
          <strong>${escapeHtml(task.text)}</strong>
          <span>${
            plant.lastWateredAt
              ? `Last watered ${formatDate(plant.lastWateredAt)} · every ${plant.water_interval_days} days`
              : `Watering every ${plant.water_interval_days} days — log your first watering to start the schedule.`
          }</span>
        </div>

        <h3>Care advice</h3>
        ${
          plant.advice
            ? `<div class="plant-advice">${escapeHtml(plant.advice)}</div>`
            : `<p class="plant-advice-empty">No care advice saved yet. PlantPal can write a care sheet for this plant.</p>
               <button type="button" class="button-secondary" id="generateAdviceButton">✨ Generate care advice</button>`
        }

        ${
          plant.notes
            ? `<h3>Notes</h3><p class="plant-notes">${escapeHtml(plant.notes)}</p>`
            : ""
        }
      </div>

      <aside class="plant-detail-side">
        <h3>Care log</h3>
        <form id="careEventForm">
          <label>Type
            <select id="careEventType">
              <option value="water">Watered</option>
              <option value="fertilize">Fertilized</option>
              <option value="repot">Repotted</option>
              <option value="prune">Pruned</option>
              <option value="other">Care note</option>
            </select>
          </label>
          <label>Note (optional)
            <input type="text" id="careEventNote" maxlength="500" placeholder="e.g. thorough soak" />
          </label>
          <label>Date (optional)
            <input type="date" id="careEventDate" />
          </label>
          <p class="form-error hidden" id="careEventError"></p>
          <button type="submit" class="button-primary">Log care</button>
        </form>

        <ul class="care-event-list">
          ${
            events.length === 0
              ? '<li class="care-event-empty">Nothing logged yet.</li>'
              : events
                  .map(
                    (eventItem) => `
            <li>
              <div>
                <strong>${escapeHtml(CARE_EVENT_LABELS[eventItem.type] || eventItem.type)}</strong>
                ${eventItem.note ? `<span>${escapeHtml(eventItem.note)}</span>` : ""}
              </div>
              <time>${formatDate(eventItem.occurred_at)}</time>
            </li>`,
                  )
                  .join("")
          }
        </ul>
      </aside>
    </div>
  `;

  plantDetail.classList.remove("hidden");

  document.getElementById("plantBackButton").addEventListener("click", function () {
    selectedPlantId = null;
    plantDetail.classList.add("hidden");
    plantDetail.innerHTML = "";
    renderPlantsGrid();
  });

  document.getElementById("waterNowButton").addEventListener("click", async function () {
    await logCareEvent(plant.id, { type: "water" });
  });

  const generateAdviceButton = document.getElementById("generateAdviceButton");
  if (generateAdviceButton) {
    generateAdviceButton.addEventListener("click", async function () {
      generateAdviceButton.disabled = true;
      generateAdviceButton.textContent = "Writing care sheet…";

      try {
        await api(`/api/plants/${plant.id}/advice`, {
          method: "POST",
        });
        const detail = await api(`/api/plants/${plant.id}`);
        renderPlantDetail(detail.plant, detail.events);
      } catch (error) {
        generateAdviceButton.disabled = false;
        generateAdviceButton.textContent = "✨ Generate care advice";

        const empty = plantDetail.querySelector(".plant-advice-empty");
        if (empty) {
          empty.textContent =
            error.status === 503
              ? "PlantPal isn't connected to an AI provider yet, so care sheets are unavailable right now."
              : error.message;
        }
      }
    });
  }

  document.getElementById("deletePlantButton").addEventListener("click", async function () {
    if (!confirm(`Remove ${plant.name} from your collection?`)) {
      return;
    }

    try {
      await api(`/api/plants/${plant.id}`, { method: "DELETE" });
    } catch (error) {
      // Removing failed; fall through so the UI reflects the stored state.
    }

    selectedPlantId = null;
    plantDetail.classList.add("hidden");
    plantDetail.innerHTML = "";
    await loadPlants();
  });

  document
    .getElementById("careEventForm")
    .addEventListener("submit", async function (event) {
      event.preventDefault();

      // The care log form lives inside the re-rendered detail view, so
      // its fields are looked up at submit time, not at page load.
      const typeInput = document.getElementById("careEventType");
      const noteInput = document.getElementById("careEventNote");
      const dateInput = document.getElementById("careEventDate");
      const dateValue = dateInput ? dateInput.value : "";

      await logCareEvent(plant.id, {
        type: typeInput.value,
        note: noteInput.value,
        ...(dateValue
          ? { occurredAt: new Date(dateValue + "T12:00:00").toISOString() }
          : {}),
      });
    });
}

// The care sheet is generated server-side; see /api/plants/:id/advice.

async function logCareEvent(plantId, fields) {
  try {
    const data = await api(`/api/plants/${plantId}/events`, {
      method: "POST",
      body: fields,
    });
    renderPlantDetail(data.plant, data.events);
    await loadPlants();
  } catch (error) {
    const errorElement = document.getElementById("careEventError");
    if (errorElement) {
      errorElement.textContent = error.message;
      errorElement.classList.remove("hidden");
    }
  }
}

addPlantButton.addEventListener("click", function () {
  addPlantForm.classList.remove("hidden");
  addPlantButton.disabled = true;
  plantNameInput.focus();
});

cancelAddPlant.addEventListener("click", function () {
  addPlantForm.classList.add("hidden");
  addPlantButton.disabled = false;
  hideAddPlantError();
});

addPlantForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const submitButton = document.getElementById("addPlantSubmit");
  submitButton.disabled = true;

  try {
    const data = await api("/api/plants", {
      method: "POST",
      body: {
        name: plantNameInput.value,
        species: plantSpeciesInput.value,
        waterIntervalDays: Number(plantIntervalInput.value),
        notes: plantNotesInput.value,
      },
    });

    addPlantForm.reset();
    addPlantForm.classList.add("hidden");
    addPlantButton.disabled = false;
    hideAddPlantError();

    await loadPlants();
    openPlant(data.plant.id);
  } catch (error) {
    if (error.status === 401) {
      setAuth(null, null);
      updateAuthUi();
      return;
    }
    showAddPlantError(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

function showAddPlantError(message) {
  const element = document.getElementById("addPlantError");
  element.textContent = message;
  element.classList.remove("hidden");
}

function hideAddPlantError() {
  const element = document.getElementById("addPlantError");
  element.textContent = "";
  element.classList.add("hidden");
}

function showSignedOutPlants() {
  plantsCache = [];
  selectedPlantId = null;
  plantsGrid.innerHTML = "";
  plantDetail.innerHTML = "";
  plantsGrid.classList.add("hidden");
  plantsEmpty.classList.add("hidden");
  plantDetail.classList.add("hidden");
  addPlantForm.classList.add("hidden");
  addPlantButton.disabled = false;
}

/* Plant finder ---------------------------------- */

const savePlantForm = document.getElementById("savePlantForm");
let lastIdentification = null;

if (finderCarousel && finderPrevButton && finderNextButton) {
  finderPrevButton.addEventListener("click", function () {
    finderCarousel.scrollBy({ left: -360, behavior: "smooth" });
  });

  finderNextButton.addEventListener("click", function () {
    finderCarousel.scrollBy({ left: 360, behavior: "smooth" });
  });
}

if (plantPhotoInput && plantPreview && plantResult) {
  plantPhotoInput.addEventListener("change", function () {
    const file = plantPhotoInput.files[0];

    if (!file) {
      return;
    }

    lastIdentification = null;
    savePlantForm.classList.add("hidden");

    const previewUrl = URL.createObjectURL(file);
    plantPreview.innerHTML = "";

    const previewImage = document.createElement("img");
    previewImage.src = previewUrl;
    previewImage.alt = "Selected plant preview";

    plantPreview.appendChild(previewImage);

    renderPlantResult("Photo ready", "Your image is ready. Click Identify Plant to identify it.");
  });
}

if (identifyPlantButton && plantPhotoInput && plantResult) {
  identifyPlantButton.addEventListener("click", async function () {
    if (!plantPhotoInput.files || plantPhotoInput.files.length === 0) {
      renderPlantResult("No photo selected", "Please choose a clear plant photo first.");
      return;
    }

    identifyPlantButton.disabled = true;
    identifyPlantButton.textContent = "Identifying...";
    savePlantForm.classList.add("hidden");

    renderPlantResult(
      "Analyzing plant photo...",
      "PlantPal is checking the leaf shape, color, and visible growth pattern.",
    );

    try {
      const image = await readFileAsDataUrl(plantPhotoInput.files[0]);
      const data = await api("/api/identify-plant", {
        method: "POST",
        body: { image },
      });

      lastIdentification = { result: data.result, image };
      renderPlantResult("PlantPal's best guess", data.result || "No identification came back. Please try again.");

      if (authUser) {
        savePlantForm.classList.remove("hidden");
        savePlantNameInput.focus();
      }
    } catch (error) {
      if (error.status === 413) {
        renderPlantResult("Photo too large", error.message);
      } else if (error.status === 503) {
        renderPlantResult(
          "Identification unavailable",
          "PlantPal isn't connected to an AI provider yet. Please check back soon.",
        );
      } else {
        renderPlantResult("Could not identify plant", "I couldn't reach the PlantPal server. Please try again.");
      }
    } finally {
      identifyPlantButton.disabled = false;
      identifyPlantButton.textContent = "Identify Plant";
    }
  });
}

savePlantForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!authUser) {
    openAuthModal();
    return;
  }

  if (!lastIdentification) {
    renderPlantResult("Nothing to save", "Identify a plant photo first.");
    return;
  }

  const submitButton = document.getElementById("savePlantSubmit");
  submitButton.disabled = true;

  try {
    await api("/api/plants", {
      method: "POST",
      body: {
        name: savePlantNameInput.value,
        waterIntervalDays: Number(savePlantIntervalInput.value),
        advice: lastIdentification.result,
        image: lastIdentification.image,
      },
    });

    savePlantForm.reset();
    savePlantForm.classList.add("hidden");
    lastIdentification = null;

    renderPlantResult(
      "Saved to My Plants 🌱",
      "Open My Plants to see its care advice and watering schedule.",
    );

    loadPlants();
  } catch (error) {
    showFormError("savePlantError", error.message);
  } finally {
    submitButton.disabled = false;
  }
});

function renderPlantResult(heading, body) {
  plantResult.innerHTML = `
    <p class="eyebrow">Result</p>
    <h3>${escapeHtml(heading)}</h3>
    <p>${escapeHtml(body)}</p>
  `;
}

function readFileAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();

    reader.onload = function () {
      resolve(reader.result);
    };

    reader.onerror = function () {
      reject(reader.error);
    };

    reader.readAsDataURL(file);
  });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* Boot ------------------------------------------- */

refreshAuth();
