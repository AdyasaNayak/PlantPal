const backendUrl = "https://plantpal-backend-dpjw.onrender.com";

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
  }
});

/* Chat ------------------------------------------ */

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
    const response = await fetch(`${backendUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: chatHistory.slice(-MAX_CHAT_HISTORY),
      }),
    });

    const data = await response.json();

    removeTypingMessage();

    if (!response.ok) {
      addMessage("Sorry, something went wrong. Please try again.", "bot");
      return;
    }

    const reply = data.reply || "Sorry, I got an empty response. Please try again.";
    addMessage(reply, "bot");
    chatHistory.push({
      role: "assistant",
      content: reply,
    });
  } catch (error) {
    removeTypingMessage();
    addMessage("I couldn't connect to the PlantPal server.", "bot");
  } finally {
    chatForm.querySelector("button").disabled = false;
    userInput.focus();
  }
});

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

/* Plant finder ---------------------------------- */

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

    renderPlantResult(
      "Analyzing plant photo...",
      "PlantPal is checking the leaf shape, color, and visible growth pattern.",
    );

    try {
      const image = await readFileAsDataUrl(plantPhotoInput.files[0]);
      const response = await fetch(`${backendUrl}/api/identify-plant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: image,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        renderPlantResult("Identification failed", "Please try again with a clearer plant photo.");
        return;
      }

      renderPlantResult("PlantPal's best guess", data.result || "No identification came back. Please try again.");
    } catch (error) {
      renderPlantResult("Could not identify plant", "I couldn't connect to the PlantPal server. Please try again.");
    } finally {
      identifyPlantButton.disabled = false;
      identifyPlantButton.textContent = "Identify Plant";
    }
  });
}

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
