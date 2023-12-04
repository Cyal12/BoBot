const express = require('express');
const app = express();
const port = 3000; // Puedes cambiar este número al puerto que prefieras
const path = require('path');

// Importación de módulos para IBM Watson
const {IamAuthenticator} = require('ibm-watson/auth');
const AssistantV2 = require('ibm-watson/assistant/v2');
const DiscoveryV2 = require('ibm-watson/discovery/v2');
const {marked} = require("marked");

// Configuración de variables de entorno
require('dotenv').config();

// Middlewares
app.use(express.json());

// Configuración de Watson Assistant y Watson Discovery
const authenticator = new IamAuthenticator({apikey: process.env.ASSISTANT_APIKEY});
const assistant = new AssistantV2({
    version: '2023-11-01',
    authenticator,
    serviceUrl: process.env.ASSISTANT_URL,
});

const discovery = new DiscoveryV2({
    version: '2023-04-01',
    authenticator: new IamAuthenticator({apikey: process.env.DISCOVERY_APIKEY}),
    serviceUrl: process.env.DISCOVERY_URL,
});

// Rutas
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.post('/user-message', async (req, res) => {
    try {
        const userMessage = req.body.message;
        if (!userMessage) {
            return res.status(400).send({error: 'No se proporcionó mensaje'});
        }

        // Obtiene la respuesta del Assistant y, si es necesario, de Discovery
        const response = await handleUserMessage(userMessage);

        // Log para depuración
        console.log(marked('**Markdown test**'));



        // Envía la respuesta completa a la interfaz de usuario
        res.send(response);
    } catch (error) {
        console.error('Error al procesar el mensaje:', error);
        res.status(500).send({error: 'Error al procesar el mensaje'});
    }
});

// Declarar una variable global para almacenar el ID de sesión
let sessionId = null;

// Función para enviar mensaje a Watson Assistant
async function sendMessageToAssistant(message) {
    try {
        // Verificar si ya hay una sesión existente
        if (!sessionId) {
            const sessionIdResponse = await assistant.createSession({assistantId: process.env.ASSISTANT_ID});
            sessionId = sessionIdResponse.result.session_id;
        }

        const response = await assistant.message({
            assistantId: process.env.ASSISTANT_ID,
            sessionId: sessionId,
            input: {'message_type': 'text', 'text': message}
        });

        console.log("Respuesta completa de Watson Assistant:", JSON.stringify(response.result, null, 2));
        return response.result;
    } catch (error) {
        console.error('Error al enviar mensaje a Watson Assistant:', error);
        throw error;
    }
}


// Función para realizar consulta a Watson Discovery
async function queryDiscovery(query) {
    try {
        const response = await discovery.query({
            projectId: process.env.DISCOVERY_PROJECT_ID,
            naturalLanguageQuery: query,
            count: 5
        });
        console.log("Respuesta de Watson Discovery:", response.result);
        return response.result;
    } catch (error) {
        console.error('Error al consultar Watson Discovery:', error);
        throw error;
    }
}

// Función para manejar mensajes de usuario
async function handleUserMessage(userMessage) {
    try {
        const assistantResponse = await sendMessageToAssistant(userMessage);
        let discoveryResults = null;

        // Verificar si hay una acción de tipo "search" en la respuesta de Watson Assistant
        const searchAction = assistantResponse.output.generic.find(element => element.response_type === "search");
        if (searchAction) {
            console.log("Acción de búsqueda encontrada");
            // Aquí puedes ajustar cómo obtienes la consulta para Discovery
            const discoveryQuery = searchAction.text;
            discoveryResults = await queryDiscovery(discoveryQuery);

            // Asegurarse de que discoveryResults tenga la estructura esperada
            if (!discoveryResults || !discoveryResults.results) {
                console.log("No se encontraron resultados de Discovery o la estructura de los datos es incorrecta");
                discoveryResults = null; // Asegurar que discoveryResults sea null si no hay resultados válidos
            }
        }

        // Construir una respuesta que incluya todos los elementos necesarios
        let response;
        response = {
            assistantResponse: assistantResponse.output.generic, // Incluye respuestas de tipo text, option, etc.
            discoveryResults: discoveryResults // Puede ser null si no se realizó una búsqueda
        };

        return response;
    } catch (error) {
        console.error('Error en handleUserMessage:', error);
        throw error;
    }
}


// Middleware de manejo de errores
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).send({error: 'Ocurrió un error en el servidor'});
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
