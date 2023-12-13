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

function appendMessage(message, className, url = null, imageData = null) {
    const chatBox = document.getElementById('chat-box');
    const messageElement = createMessageElement(message, className, url, imageData);
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

function createMessageElement(message, className, url = null, imageData = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', className);

    if (className === 'bot-message') {
        const botImg = document.createElement('img');
        botImg.src = "https://avatars.githubusercontent.com/u/10017763?s=280&v=4";
        botImg.alt = "Bot";
        botImg.classList.add('bot-img');
        messageDiv.appendChild(botImg);

        if (imageData && imageData.response_type === 'image') {
            const imageElement = document.createElement('img');
            imageElement.src = imageData.source;
            imageElement.alt = imageData.alt_text || 'Image response';
            imageElement.classList.add('response-image');
            messageDiv.appendChild(imageElement);
        } else {
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
        }
    } else {
        messageDiv.textContent = message;
    }
    return messageDiv;
}

function createMessageElementDiscovery(message, className, url = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', className);

    if (className === 'bot-message-discovery') {
        message = message.charAt(0).toUpperCase() + message.slice(1);
        const botImg = document.createElement('img');
        botImg.src = "https://connect.redhat.com/s3api/prod-s3api/discoicon.png";
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

function handlePause(time) {
    return new Promise(resolve => setTimeout(resolve, time));
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

function startTypingAnimation() {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'bot-message');

    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-animation';
    typingDiv.classList.add('typing-animation');

    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        dot.classList.add('typing-dot');
        dot.style.animationDelay = `${0.2 * i}s`;
        dot.textContent = '.';
        typingDiv.appendChild(dot);
    }

    messageDiv.appendChild(typingDiv);
    chatBox.appendChild(messageDiv);
    scrollToBottom();
}

function stopTypingAnimation() {
    const typingDiv = document.getElementById('typing-animation');
    if (typingDiv) {
        typingDiv.remove();
    }
}

function processAssistantResponse(data) {
    const chatBox = document.getElementById('chat-box');
    if (data.assistantResponse) {
        let promise = Promise.resolve();
        data.assistantResponse.forEach(element => {
            if (element.response_type === 'pause') {
                promise = promise.then(() => {
                    startTypingAnimation();
                    return handlePause(element.time);
                }).then(() => {
                    stopTypingAnimation();
                });
            } else {
                promise = promise.then(() => {
                    if (element.response_type === 'text') {
                        const textResponse = createMessageElement(marked.parse(element.text), 'bot-message');
                        chatBox.appendChild(textResponse);

                    } else if (element.response_type === 'image') {
                        const imageResponse = createMessageElement('', 'bot-message', null, element);
                        chatBox.appendChild(imageResponse);

                    } else if (element.response_type === 'search' && element.primary_results) {
                        element.primary_results.forEach(result => {
                            if (result.answers) {
                                result.answers.forEach(answer => {
                                    const answerElement = createMessageElementDiscovery(answer.text, 'bot-message-discovery', result.url);
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
        });
    }
}