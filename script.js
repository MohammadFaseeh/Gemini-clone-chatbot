const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptform = document.querySelector(".prompt-form");
const promptInput = promptform.querySelector(".prompt-input");
const fileInput = promptform.querySelector("#file-input");
const fileUploadWrapper = promptform.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");

// API Setup
const API_KEY = "YOUR_API_KEY_HERE";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

let typingInterval, controller;
const chatHistory = [];
const userData = { message: "", file: {} };

// Function to create message elements
const createMsgElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Scroll to bottom of container
const scrollToBottom = () =>
  container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

// Simulate typing effect for bot responses
const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const chars = text.split("");
  let charIndex = 0;

  // set an interval to type each word
  typingInterval = setInterval(() => {
    if (charIndex < chars.length) {
      textElement.textContent += chars[charIndex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 20);
};

// Make the api call and generate the bot's response
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();
  // Add user Message and file data to the chat history
  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file.data
        ? [
            {
              inline_data: (({ fileName, isImage, ...rest }) => rest)(
                userData.file
              ),
            },
          ]
        : []),
    ],
  });
  try {
    // send a chat history to api to get response
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    // Process the response text and display with typing effect
    const responseText = data.candidates[0].content.parts[0].text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .trim();
    typingEffect(responseText, textElement, botMsgDiv);

    chatHistory.push({
      role: "model",
      parts: [{ text: responseText }],
    });
  } catch (error) {
    textElement.style.color = "#d62939";
    textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding"); 
  } finally {
    userData.file = {};
    scrollToBottom(); 
  }
};

// handle the form submission
const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;

  promptInput.value = "";
  userData.message = userMessage;
  document.body.classList.add("bot-responding", "chats-active");
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

  // Generate user Message HTML with optinal file attachment
  const userMsgHTML = `
  <p class="message-text"></p>
  ${
    userData.file && userData.file.data
      ? userData.file.isImage
        ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />`
        : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`
      : ""
  }
`;
  const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userMessage;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  setTimeout(() => {
    // Generate bot Message HTML and adds in the chats container after 600ms
    const botMsgHTML = ` <img src="gemini.svg" class="avatar"><p class = "message-text">Just a sec..</p>`;
    const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600);
};

// Handle file input change (file upload)
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = (e) => {
    fileInput.value = "";
    const base64string = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add(
      "active",
      isImage ? "img-attached" : "file-attached"
    );

    // Store file data in userData obj
    userData.file = {
      fileName: file.name,
      data: base64string,
      mime_type: file.type,
      isImage,
    };
  };
});

// Cancel file Upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});
// stop ongoing bot response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  userData.file = {};
  controller?.abort();
  clearInterval(typingInterval); 
  chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

// Delete all chats
document.querySelector("#delete_chats-btn").addEventListener("click", () => {
chatHistory.length = 0;
chatsContainer.innerHTML = "";
document.body.classList.remove("bot-responding", "chats-active");
});

// handle suggestion click
document.querySelectorAll(".suggestions-item").forEach(item=> {
  item.addEventListener("click", () =>{
    promptInput.value = item.querySelector(".text").textContent;
    promptform.dispatchEvent(new Event("submit"));
  })
});

// Show/hide controls for mobile on prompt input focus
document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const shouldHide = target.classList.contains("prompt-input") || (wrapper.classList.contains("hide-controls") && (target.id ==="add-file-btn" || target.id === "stop-response-btn"));
  wrapper.classList.toggle("hide-controls", shouldHide);
});

// Toggle dark/light theme
themeToggle.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

// Set initial theme from local storage
  const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
  document.body.classList.toggle("light-theme",isLightTheme);
  themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";

promptform.addEventListener("submit", handleFormSubmit);
promptform
  .querySelector("#add-file-btn")
  .addEventListener("click", () => fileInput.click());