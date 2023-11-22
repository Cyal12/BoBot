const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000; // Puedes cambiar este número al puerto que prefieras
const path = require('path');

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(bodyParser.json());

require('dotenv').config();

const AssistantV2 = require('ibm-watson/assistant/v2');
const DiscoveryV2 = require('ibm-watson/discovery/v2');
const { IamAuthenticator } = require('ibm-watson/auth');

// Configuración de Watson Assistant
const assistant = new AssistantV2({
  version: '2023-11-01',
  authenticator: new IamAuthenticator({ apikey: process.env.ASSISTANT_APIKEY }),
  serviceUrl: process.env.ASSISTANT_URL,
});

// Configuración de Watson Discovery
const discovery = new DiscoveryV2({
  version: '2023-04-01',
  authenticator: new IamAuthenticator({ apikey: process.env.DISCOVERY_APIKEY }),
  serviceUrl: process.env.DISCOVERY_URL,
});

// Función para enviar mensaje a Watson Assistant
async function sendMessageToAssistant(message) {
  try {
    const sessionIdResponse = await assistant.createSession({ assistantId: process.env.ASSISTANT_ID });
    const sessionId = sessionIdResponse.result.session_id;

    const response = await assistant.message({
      assistantId: process.env.ASSISTANT_ID,
      sessionId: sessionId,
      input: { 'message_type': 'text', 'text': message }
    });

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
    // Verificar si la respuesta de Assistant incluye una acción de búsqueda
    if (assistantResponse.output.actions && assistantResponse.output.actions[0].type === "search") {
      // Enviar consulta a Watson Discovery
      const discoveryQuery = assistantResponse.output.actions[0].parameters.query;
      const discoveryResults = await queryDiscovery(discoveryQuery);
      return { assistantResponse, discoveryResults }; // Devuelve ambos resultados
    } else {
      // Si no es una acción de búsqueda, devuelve solo la respuesta de Assistant
      return { assistantResponse };
    }
    
  } catch (error) {
    console.error('Error al manejar el mensaje del usuario:', error, assistantResponse);
    throw error;
  }
}



// Ruta POST para manejar los mensajes del usuario
app.post('/user-message', async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) {
      return res.status(400).send({ error: 'No se proporcionó mensaje' });
    }

    const response = await handleUserMessage(userMessage);
    console.log("Respuesta:", response);
    res.send(response);
  } catch (error) {
    console.error('Error al procesar el mensaje:', error);
    res.status(500).send({ error: 'Error al procesar el mensaje' });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
