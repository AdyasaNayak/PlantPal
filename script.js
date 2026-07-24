const homeButton = document.getElementById("homeButton");
const startChatButton = document.getElementById("startChatButton");
const startDiagnoseButton = document.getElementById("startDiagnoseButton");
const startCareGuideButton = document.getElementById("startCareGuideButton");
const startWateringButton = document.getElementById("startWateringButton");
const sidebarHomeButton = document.getElementById("sidebarHomeButton");
const sidebarAskButton = document.getElementById("sidebarAskButton");
const sidebarDiagnoseButton = document.getElementById("sidebarDiagnoseButton");
const sidebarFindPlantButton = document.getElementById("sidebarFindPlantButton");
const sidebarCareGuideButton = document.getElementById("sidebarCareGuideButton");
const sidebarWateringButton = document.getElementById("sidebarWateringButton");
const sidebarPetSafetyButton = document.getElementById("sidebarPetSafetyButton");
const appLayout = document.querySelector(".app");
const landingPage = document.querySelector(".landing-page");
const featurePages = document.querySelectorAll(".feature-page");
const diagnosePage = document.getElementById("diagnosePage");
const findPlantPage = document.getElementById("findPlantPage");
const careGuidePage = document.getElementById("careGuidePage");
const wateringPage = document.getElementById("wateringPage");
const petSafetyPage = document.getElementById("petSafetyPage");
const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatMessages = document.getElementById("chatMessages");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.querySelector(".theme-icon");
const navItems = document.querySelectorAll(".nav-item");
const pageHomeButtons = document.querySelectorAll(".page-home-button");

const savedTheme = localStorage.getItem("plantpal-theme");

if(savedTheme === "dark") {
  document.body.classList.add("dark-mode");
  themeIcon.textContent = "☼";
  themeToggle.setAttribute("aria-label", "Switch to light mode");
}

const plantReplies = [
  "Most houseplants prefer watering only when the top inch of soil feels dry.",
  "Yellow leaves can happen because of overwatering, poor drainage, low light, or normal aging.",
  "For many indoor plants, bright indirect light is safer than harsh direct sunlight.",
  "If you see pests, gently wipe the leaves and isolate the plant from your other plants.",
  "A good care routine depends on the plant type, pot size, light, humidity, and season.",
];

chatForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const message = userInput.value.trim();

  if (message === "") {
    return;
  }

  addMessage(message, "user");
  userInput.value = "";

  showTypingMessage();

  setTimeout(function () {
    removeTypingMessage();

    const randomReply =
      plantReplies[Math.floor(Math.random() * plantReplies.length)];

    addMessage(randomReply, "bot");
  }, 900);
});

homeButton.addEventListener("click", function () {
  showLandingPage();
});

themeToggle.addEventListener("click", function () {
  document.body.classList.toggle("dark-mode");

  if (document.body.classList.contains("dark-mode")) {
    themeIcon.textContent = "☼";
    themeToggle.setAttribute("aria-label", "Switch to light mode");
    localStorage.setItem("plantpal-theme", "dark");
  } else {
    themeIcon.textContent = "◐";
    themeToggle.setAttribute("aria-label", "Switch to dark mode");
    localStorage.setItem("plantpal-theme", "light");
  }
});

menuButton.addEventListener("click", function () {
  sidebar.classList.toggle("open");
  menuButton.classList.toggle("open");
});

startChatButton.addEventListener("click", function () {
  showChatPage();
});

startDiagnoseButton.addEventListener("click", function () {
  showFeaturePage(diagnosePage, sidebarDiagnoseButton);
});

startCareGuideButton.addEventListener("click", function () {
  showFeaturePage(careGuidePage, sidebarCareGuideButton);
});

startWateringButton.addEventListener("click", function () {
  showFeaturePage(wateringPage, sidebarWateringButton);
});

sidebarHomeButton.addEventListener("click", function () {
  showLandingPage();
});

sidebarAskButton.addEventListener("click", function () {
  showChatPage();
});

sidebarDiagnoseButton.addEventListener("click", function () {
  showFeaturePage(diagnosePage, sidebarDiagnoseButton);
});

sidebarFindPlantButton.addEventListener("click", function () {
  showFeaturePage(findPlantPage, sidebarFindPlantButton);
});

sidebarCareGuideButton.addEventListener("click", function () {
  showFeaturePage(careGuidePage, sidebarCareGuideButton);
});

sidebarWateringButton.addEventListener("click", function () {
  showFeaturePage(wateringPage, sidebarWateringButton);
});

sidebarPetSafetyButton.addEventListener("click", function () {
  showFeaturePage(petSafetyPage, sidebarPetSafetyButton);
});

pageHomeButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    showLandingPage();
  });
});

navItems.forEach(function (button) {
  button.addEventListener("click", function () {
    if (button.id) {
      return;
    }

    navItems.forEach(function (item) {
      item.classList.remove("active");
    });

    button.classList.add("active");
  });
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
  typingElement.textContent = "PlantPal is thinking...";

  chatMessages.appendChild(typingElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingMessage() {
  const typingElement = document.querySelector(".typing");

  if (typingElement) {
    typingElement.remove();
  }
}

function showLandingPage() {
  appLayout.classList.add("hidden");
  landingPage.classList.remove("hidden");
  hideFeaturePages();
  sidebar.classList.remove("open");
  menuButton.classList.remove("open");

  setActiveNav(sidebarHomeButton);
}

function showChatPage() {
  landingPage.classList.add("hidden");
  appLayout.classList.remove("hidden");
  hideFeaturePages();
  sidebar.classList.remove("open");
  menuButton.classList.remove("open");

  setActiveNav(sidebarAskButton);
}

function showFeaturePage(page, activeButton) {
  landingPage.classList.add("hidden");
  appLayout.classList.add("hidden");
  hideFeaturePages();
  page.classList.remove("hidden");
  sidebar.classList.remove("open");
  menuButton.classList.remove("open");

  setActiveNav(activeButton);
}

function hideFeaturePages() {
  featurePages.forEach(function (page) {
    page.classList.add("hidden");
  });
}

function setActiveNav(activeButton) {
  navItems.forEach(function (item) {
    item.classList.remove("active");
  });

  activeButton.classList.add("active");
}
