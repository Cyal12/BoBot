let isWelcomeMessageShown = false;

document.getElementById('chat-button').addEventListener('click', function() {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.classList.toggle('expanded');
    if (!isWelcomeMessageShown) {
        const chatBox = document.getElementById('chat-box');
        const welcomeMessage = createMessageElement('Welcome to BoBot :D ! How can I help you today?', 'bot-message');
        chatBox.appendChild(welcomeMessage);
        isWelcomeMessageShown = true;
    }

    const chatButton = document.getElementById('chat-button');
    chatButton.style.display = chatContainer.classList.contains('expanded') ? 'none' : 'block';
});

document.getElementById('minimize-button').addEventListener('click', function(e) {
    const chatContainer = document.getElementById('chat-container');
    const chatButton = document.getElementById('chat-button');

    if (chatContainer.classList.contains('expanded')) {
        chatContainer.classList.remove('expanded');
        chatButton.style.display = 'block';
    }
    e.stopPropagation();
});

document.getElementById('fullscreen-button').addEventListener('click', function() {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer.classList.contains('fullscreen')) {
        chatContainer.classList.remove('fullscreen');
    } else {
        chatContainer.classList.add('fullscreen');
    }
});

function scrollToBottom() {
    const chatBox = document.getElementById('chat-box');
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom of the chat box
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
                const linkElement = createLinkElement(url, 'bot-message-link');
                messageDiv.appendChild(linkElement);
            }
        } else {
            messageDiv.textContent = message;
        }

        return messageDiv;
    }

    function createLinkElement(url, classNames) {
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.textContent = "More information";
        linkElement.className = classNames;
        linkElement.target = "_blank";
        linkElement.rel = "noopener noreferrer";
        return linkElement;
    }

    document.getElementById('user-input').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            let userMessage = this.value.trim();
            if (userMessage === '') return; //

            this.value = '';
            const chatBox = document.getElementById('chat-box');
            const userMessageElement = createMessageElement(userMessage, 'user-message');
            chatBox.appendChild(userMessageElement);
            fetch('/user-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({message: userMessage}),
            })
                .then(response => response.json())
                .then(data => {
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
                                    button.addEventListener('click', function() {
                                        sendResponse(option.label);
                                    });
                                    buttonsDiv.appendChild(button);
                                });
                                chatBox.appendChild(buttonsDiv);
                            }
                            scrollToBottom();
                        });
                    }
                    chatBox.scrollTop = chatBox.scrollHeight;
                    chatBox.style.scrollBehavior = 'smooth';
                });
        }
    });

    function disableResponseButtons() {
        const buttons = document.querySelectorAll('.response-button');
        buttons.forEach(button => {
            button.disabled = true;
        });
    }


    function sendResponse(responseText) {
        disableResponseButtons();
        const url = 'http://localhost:3000/user-message';
        const data = {
            message: responseText
        };
        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        };
        fetch(url, fetchOptions)
            .then(response => response.json())
            .then(data => {
                console.log('Respuesta del servidor:', data);
                updateChat(data);
                scrollToBottom()
            })
            .catch(error => {
                console.error('Error al enviar la respuesta:', error);
            });
    }

    function enableButtonClickListener() {
        const buttons = document.querySelectorAll('.response-button');
        buttons.forEach(button => {
            button.disabled = false; // Habilitar el botón
            button.addEventListener('click', function() {
                const responseText = this.textContent;
                sendResponse(responseText);
            });
        });
    }

    enableButtonClickListener();

    function updateChat(data) {
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
                                const messageContainer = document.createElement('div');
                                messageContainer.className = 'bot-message';
                                const answerElement = createMessageElement(answer.text, '');
                                messageContainer.appendChild(answerElement);
                                if (result.url) {
                                    const linkElement = createLinkElement(result.url, 'bot-message-link');
                                    messageContainer.appendChild(linkElement);
                                }
                                chatBox.appendChild(messageContainer);
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
                        button.addEventListener('click', function() {
                            sendResponse(option.label);
                        });
                        buttonsDiv.appendChild(button);
                    });
                    chatBox.appendChild(buttonsDiv);
                }
                scrollToBottom();
            });
            chatBox.scrollTop = chatBox.scrollHeight;
        }
        chatBox.style.scrollBehavior = 'smooth';
    }