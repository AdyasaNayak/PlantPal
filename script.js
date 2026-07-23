const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatMessages = document.getElementById("chatMessages");
const themeToggle = document.getElementById("themeToggle");

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
