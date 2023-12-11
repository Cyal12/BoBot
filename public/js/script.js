let isWelcomeMessageShown = false;

document.getElementById('chat-button').addEventListener('click', toggleChat);
document.getElementById('minimize-button').addEventListener('click', minimizeChat);
document.getElementById('fullscreen-button').addEventListener('click', toggleFullscreen);
document.getElementById('user-input').addEventListener('keypress', handleUserInput);
document.getElementById('enter').addEventListener('click', () => handleUserInput({ key: 'Enter' }));

function toggleChat() {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.classList.toggle('expanded');
    document.getElementById('chat-button').style.display = chatContainer.classList.contains('expanded') ? 'none' : 'block';

    if (!isWelcomeMessageShown) {
        appendMessage('Welcome to BoBot :D ! How can I help you today?', 'bot-message');
        isWelcomeMessageShown = true;
    }
}

function minimizeChat(e) {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer.classList.contains('expanded')) {
        chatContainer.classList.remove('expanded');
        document.getElementById('chat-button').style.display = 'block';
    }
    e.stopPropagation();
}

function toggleFullscreen() {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.classList.toggle('fullscreen');
}

function handleUserInput(e) {
    if (e.key === 'Enter') {
        const userInput = document.getElementById('user-input');
        let userMessage = userInput.value.trim();
        if (userMessage) {
            appendMessage(userMessage, 'user-message');
            sendUserMessage(userMessage);
        }
        userInput.value = '';
    }
}

function appendMessage(message, className, url = null) {
    const chatBox = document.getElementById('chat-box');
    const messageElement = createMessageElement(message, className, url);
    chatBox.appendChild(messageElement);
    scrollToBottom();
}

function disableResponseButtons() {
    const buttons = document.querySelectorAll('.response-button');
    buttons.forEach(button => {
        button.disabled = true;
    });
}
function handleButtonResponse(optionLabel) {
    sendUserMessage(optionLabel);
    disableResponseButtons();
}

function createMessageElement(message, className, url = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', className);

    if (className === 'bot-message') {
        const botImg = document.createElement('img');
        botImg.src = "https://avatars.githubusercontent.com/u/10017763?s=280&v=4";
        botImg.alt = "Bot";
        botImg.classList.add('bot-img');
        messageDiv.appendChild(botImg);

        const messageText = document.createElement('span');
        messageText.innerHTML = message;
        messageDiv.appendChild(messageText);

        if (url) {
            const linkElement = document.createElement('a');
            linkElement.href = url;
            linkElement.textContent = "More information";
            linkElement.className = 'bot-message-link';
            linkElement.target = "_blank";
            linkElement.rel = "noopener noreferrer";
            messageDiv.appendChild(linkElement);
        }
    } else {
        messageDiv.textContent = message;
    }
    return messageDiv;
}

function scrollToBottom() {
    const chatBox = document.getElementById('chat-box');
    chatBox.scrollTop = chatBox.scrollHeight;
}

function sendUserMessage(message) {
    fetch('/user-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    })
        .then(response => response.json())
        .then(data => processAssistantResponse(data))
        .catch(error => console.error('Error:', error));
}

function processAssistantResponse(data) {
    const chatBox = document.getElementById('chat-box');
    if (data.assistantResponse) {
        data.assistantResponse.forEach(element => {
            if (element.response_type === 'text') {
                const textResponse = createMessageElement(marked.parse(element.text), 'bot-message');
                chatBox.appendChild(textResponse);
            } else if (element.response_type === 'search' && element.primary_results) {
                element.primary_results.forEach(result => {
                    if (result.answers) {
                        result.answers.forEach(answer => {
                            const answerElement = createMessageElement(answer.text, 'bot-message', result.url);
                            chatBox.appendChild(answerElement);
                        });
                    }
                });
            } else if (element.response_type === 'option') {
                const buttonsDiv = document.createElement('div');
                buttonsDiv.classList.add('bot-message', 'button');
                element.options.forEach(option => {
                    const button = document.createElement('button');
                    button.textContent = option.label;
                    button.classList.add('response-button');
                    button.addEventListener('click', () => handleButtonResponse(option.label));
                    buttonsDiv.appendChild(button);
                });
                chatBox.appendChild(buttonsDiv);
            }
            scrollToBottom();
        });
    }
}
