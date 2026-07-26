const homeButton = document.getElementById("homeButton");
const startChatButton = document.getElementById("startChatButton");
const startDiagnoseButton = document.getElementById("startDiagnoseButton");
const startCareGuideButton = document.getElementById("startCareGuideButton");
const startWateringButton = document.getElementById("startWateringButton");
const sidebarHomeButton = document.getElementById("sidebarHomeButton");
const sidebarAskButton = document.getElementById("sidebarAskButton");
const sidebarDiagnoseButton = document.getElementById("sidebarDiagnoseButton");
const sidebarFindPlantButton = document.getElementById(
  "sidebarFindPlantButton",
);
const sidebarCareGuideButton = document.getElementById(
  "sidebarCareGuideButton",
);
const sidebarWateringButton = document.getElementById("sidebarWateringButton");
const sidebarPetSafetyButton = document.getElementById(
  "sidebarPetSafetyButton",
);
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
const finderCarousel = document.getElementById("finderCarousel");
const finderPrevButton = document.getElementById("finderPrevButton");
const finderNextButton = document.getElementById("finderNextButton");
const plantPhotoInput = document.getElementById("plantPhotoInput");
const plantPreview = document.getElementById("plantPreview");
const plantResult = document.getElementById("plantResult");
const identifyPlantButton = document.getElementById("identifyPlantButton");
const chatHistory = [];

const savedTheme = localStorage.getItem("plantpal-theme");

if (savedTheme === "dark") {
  document.body.classList.add("dark-mode");
  themeIcon.textContent = "☼";
  themeToggle.setAttribute("aria-label", "Switch to light mode");
}

chatForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const message = userInput.value.trim();

  if (message === "") {
    return;
  }

  addMessage(message, "user");
  userInput.value = "";

  chatHistory.push({
    role: "user",
    content: message,
  });

  showTypingMessage();

  try {
    const response = await fetch(
      "https://plantpal-backend-dpjw.onrender.com/api/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: chatHistory,
        }),
      },
    );

    const data = await response.json();

    removeTypingMessage();

    if (!response.ok) {
      addMessage("Sorry, something went wrong. Please try again.", "bot");
      return;
    }

    addMessage(data.reply, "bot");

    chatHistory.push({
      role: "assistant",
      content: data.reply,
    });
  } catch (error) {
    removeTypingMessage();
    addMessage("I couldn't connect to the PlantPal server.", "bot");
  }
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

if (finderCarousel && finderPrevButton && finderNextButton) {
  finderPrevButton.addEventListener("click", function () {
    finderCarousel.scrollBy({
      left: -360,
      behavior: "smooth",
    });
  });

  finderNextButton.addEventListener("click", function () {
    finderCarousel.scrollBy({
      left: 360,
      behavior: "smooth",
    });
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

    plantResult.innerHTML = `
      <p class="eyebrow">Result</p>
      <h3>Photo ready</h3>
      <p>
        Your image is ready. Click Identify Plant to prepare this flow for AI detection.
      </p>
    `;
  });
}

if (identifyPlantButton && plantPhotoInput && plantResult) {
  identifyPlantButton.addEventListener("click", function () {
    if (!plantPhotoInput.files || plantPhotoInput.files.length === 0) {
      plantResult.innerHTML = `
        <p class="eyebrow">Result</p>
        <h3>No photo selected</h3>
        <p>Please choose a clear plant photo first.</p>
      `;
      return;
    }

    plantResult.innerHTML = `
      <p class="eyebrow">Result</p>
      <h3>Plant detection coming soon</h3>
      <p>
        Next, this button will send the uploaded image to the backend and return
        likely plant names and beginner-friendly care guidance.
      </p>
    `;
  });
}

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
