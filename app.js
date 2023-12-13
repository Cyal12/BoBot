const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const {IamAuthenticator} = require('ibm-watson/auth');
const AssistantV2 = require('ibm-watson/assistant/v2');
const DiscoveryV2 = require('ibm-watson/discovery/v2');

require('dotenv').config();
app.use(express.json());

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
        const response = await handleUserMessage(userMessage);
        res.send(response);
    } catch (error) {
        console.error('Error al procesar el mensaje:', error);
        res.status(500).send({error: 'Error al procesar el mensaje'});
    }
});

let sessionId = null;
async function sendMessageToAssistant(message) {
    try {
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
async function handleUserMessage(userMessage) {
    try {
        const assistantResponse = await sendMessageToAssistant(userMessage);
        let discoveryResults = null;
        const searchAction = assistantResponse.output.generic.find(element => element.response_type === "search");
        if (searchAction) {
            console.log("Acción de búsqueda encontrada");
            const discoveryQuery = searchAction.text;
            discoveryResults = await queryDiscovery(discoveryQuery);
            if (!discoveryResults || !discoveryResults.results) {
                console.log("No se encontraron resultados de Discovery o la estructura de los datos es incorrecta");
                discoveryResults = null;
            }
        }
        let response;
        response = {
            assistantResponse: assistantResponse.output.generic,
            discoveryResults: discoveryResults
        };
        return response;
    } catch (error) {
        console.error('Error en handleUserMessage:', error);
        throw error;
    }
}
app.use(server);
function server(err, _req, res, _next) {
    console.error(err);
    res.status(500).send({error: 'Ocurrió un error en el servidor'});
}

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
