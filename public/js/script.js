// Estado para rastrear si el mensaje de bienvenida se ha mostrado

let isWelcomeMessageShown = false;

document.getElementById('chat-button').addEventListener('click', function() {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.classList.toggle('expanded');
    if (!isWelcomeMessageShown) {
        const chatBox = document.getElementById('chat-box');
        chatBox.innerHTML += `<div class="message bot-message"><img src="https://avatars.githubusercontent.com/u/10017763?s=280&v=4" alt="Bot" class="bot-img">Welcome to BoBot :D ! How can I help you today?</div>`;
        isWelcomeMessageShown = true; //
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
    chatBox.scrollTop = chatBox.scrollHeight; // Desplaza hasta el final del chatBox
}

document.getElementById('user-input').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        let userMessage = this.value;
        this.value = '';

        let chatBox = document.getElementById('chat-box');
        chatBox.innerHTML += `<div class="message user-message">${userMessage}</div>`;

        fetch('/user-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({message: userMessage}),
        })
            .then(response => response.json())
            .then(data => {
                if (data.assistantResponse) {
                    data.assistantResponse.forEach(element => {
                        if (element.response_type === 'text') {
                            const convertedText = marked.parse(element.text);
                            // Mostrar respuestas de texto
                            chatBox.innerHTML += `<div class="message bot-message"><img src="https://avatars.githubusercontent.com/u/10017763?s=280&v=4" alt="Bot" class="bot-img">${convertedText}</div>`;
                            scrollToBottom()
                        } else if (element.response_type === 'search' && element.primary_results) {
                            // Mostrar respuestas de búsqueda
                            element.primary_results.forEach(result => {
                                if (result.answers) {
                                    const answersText = result.answers.map(answer => `<div>${answer.text}</div>`).join('<br>');
                                    chatBox.innerHTML += `<div class="message bot-message"><img src="data:image/png;base64,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" alt="Discovery" class="bot-img">${answersText}</div>`;
                                    scrollToBottom()
                                }

                            });
                        } else if (element.response_type === 'option') {
                            // Crear botones para las opciones
                            let buttonsHTML = '';
                            element.options.forEach(option => {
                                buttonsHTML += `<button class="response-button">${option.label}</button>`;
                            });
                            chatBox.innerHTML += `<div class="bot-message button">${buttonsHTML}</div>`;
                            scrollToBottom()
                        }
                    });

                    // Agregar el evento onclick a los botones después de crearlos
                    const buttons = chatBox.querySelectorAll('.response-button');
                    buttons.forEach(button => {
                        button.addEventListener('click', function () {
                            const responseText = this.textContent;
                            sendResponse(responseText);
                        });
                    });
                }
                chatBox.scrollTop = chatBox.scrollHeight;
                chatBox.style.scrollBehavior = 'smooth';
            });
    }
});

// Función para desactivar todos los botones de respuesta
function disableResponseButtons() {
    const buttons = document.querySelectorAll('.response-button');
    buttons.forEach(button => {
        button.disabled = true;
    });
}


// Función para enviar respuesta al servidor
function sendResponse(responseText) {
    disableResponseButtons();
    // URL del endpoint en tu servidor que se comunica con Watson Assistant
    const url = 'http://localhost:3000/user-message';

    // Datos a enviar
    const data = {
        message: responseText
    };

    // Opciones para la solicitud fetch
    const fetchOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    };

    // Realizar la solicitud
    fetch(url, fetchOptions)
        .then(response => response.json())
        .then(data => {
            // Manejar la respuesta del servidor si es necesario
            console.log('Respuesta del servidor:', data);

            // Actualizar el chat con la respuesta del servidor
            updateChat(data);
            scrollToBottom()
        })
        .catch(error => {
            console.error('Error al enviar la respuesta:', error);
        });
}

// Función para habilitar la capacidad de hacer clic en los botones
function enableButtonClickListener() {
    const buttons = document.querySelectorAll('.response-button');
    buttons.forEach(button => {
        button.disabled = false; // Habilitar el botón
        button.addEventListener('click', function () {
            const responseText = this.textContent;
            sendResponse(responseText);
        });
    });
}


// Inicialmente, habilitar la capacidad de hacer clic en los botones
enableButtonClickListener();

// Función para actualizar el chat con la respuesta del servidor
function updateChat(data) {
    const chatBox = document.getElementById('chat-box');

    if (data.assistantResponse) {
        data.assistantResponse.forEach(element => {
            if (element.response_type === 'text') {
                const convertedText = marked.parse(element.text);
                // Mostrar respuestas de texto
                chatBox.innerHTML += `<div class="message bot-message"><img src="https://avatars.githubusercontent.com/u/10017763?s=280&v=4" alt="Bot" class="bot-img">${convertedText}</div>`;
                scrollToBottom()
            } else if (element.response_type === 'search' && element.primary_results) {
                // Mostrar respuestas de búsqueda
                element.primary_results.forEach(result => {
                    if (result.answers) {
                        const answersText = result.answers.map(answer => `<div>${answer.text}</div>`).join('<br>');
                        chatBox.innerHTML += `<div class="message bot-message"><img src="data:image/png;base64,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" alt="Discovery" class="bot-img">${answersText}</div>`;
                        scrollToBottom()
                    }
                });
            } else if (element.response_type === 'option') {
                let buttonsHTML = '';
                element.options.forEach(option => {
                    buttonsHTML += `<button class="response-button">${option.label}</button>`;
                });
                chatBox.innerHTML += `<div class="bot-message button">${buttonsHTML}</div>`;
                scrollToBottom()
                // Agregar el evento onclick a los botones después de crearlos
                const buttons = chatBox.querySelectorAll('.response-button');
                buttons.forEach(button => {
                    button.addEventListener('click', function () {
                        const responseText = this.textContent;
                        sendResponse(responseText);
                    });
                });
            }
        });
    }
    chatBox.scrollTop = chatBox.scrollHeight;
    chatBox.style.scrollBehavior = 'smooth';

}