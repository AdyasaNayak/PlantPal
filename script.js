const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatMessages = document.getElementById("chatMessages");
const themeToggle = document.getElementById("themeToggle");
const navItems = document.querySelectorAll(".nav-item");
const topicButtons = document.querySelectorAll(".topic-btn");

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

themeToggle.addEventListener("click", function () {
  document.body.classList.toggle("dark-mode");

  if (document.body.classList.contains("dark-mode")) {
    themeToggle.textContent = "Light Mode";
  } else {
    themeToggle.textContent = "Dark Mode";
  }
});

const promptMap = {
  "Ask PlantPal": "How can you help me take care of my houseplants?",
  "Diagnose a Problem":
    "My plant looks unhealthy. Can you help me diagnose the problem?",
  "Find your Houseplant": "Can you help me identify what houseplant I have?",
  "Care Guide": "Can you give me a beginner-friendly houseplant care guide?",
  "Watering Schedule":
    "Can you help me create a watering schedule for my plant?",
  "Pet Safety": "Can you tell me which common houseplants are safe for pets?",
  "Yellow Leaves": "Why are my plant leaves turning yellow?",
  "Brown Tips": "Why are the tips of my plant leaves turning brown?",
  Overwatering: "How do I know if I am overwatering my plant?",
  "Low Light plants": "What are the best low light houseplants for beginners?",
};

navItems.forEach(function (button) {
  button.addEventListener("click", function () {
    navItems.forEach(function (item) {
      item.classList.remove("active");
    });

    button.classList.add("active");
  });
});

topicButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const prompt = promptMap[button.textContent.trim()];
    sendPrompt(prompt);
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

function sendPrompt(prompt) {
  if (!prompt) {
    return;
  }

  addMessage(prompt, "user");

  showTypingMessage();

  setTimeout(function () {
    removeTypingMessage();

    const randomReply =
      plantReplies[Math.floor(Math.random() * plantReplies.length)];

    addMessage(randomReply, "bot");
  }, 900);
}
