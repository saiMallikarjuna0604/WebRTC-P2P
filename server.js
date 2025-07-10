const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors());
app.use(express.json());

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Map();

// Basic email validation
const isValidEmail = (email) => {
  return email && email.includes('@') && email.includes('.');
};

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New client connected');
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data.type, 'from:', data.from, 'to:', data.to);
      
      // Handle different message types
      switch (data.type) {
        case 'register':
          // Validate email
          if (!isValidEmail(data.email)) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid email format'
            }));
            return;
          }
          
          // Check if email is already registered
          if (clients.has(data.email)) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Email already in use'
            }));
            return;
          }
          
          // Register user
          clients.set(data.email, ws);
          ws.email = data.email;
          console.log(`User registered: ${data.email}`);
          
          // Send confirmation
          ws.send(JSON.stringify({
            type: 'registered',
            email: data.email
          }));
          break;
          
        case 'call-request':
          // Forward call request to target user
          const targetClient = clients.get(data.to);
          if (targetClient) {
            targetClient.send(JSON.stringify({
              type: 'incoming-call',
              from: data.from
            }));
            console.log(`Call request from ${data.from} to ${data.to}`);
          } else {
            // Target user not online
            ws.send(JSON.stringify({
              type: 'call-failed',
              reason: 'User not online'
            }));
          }
          break;
          
        case 'call-answer':
          // Forward call answer to caller
          const callerClient = clients.get(data.to);
          if (callerClient) {
            callerClient.send(JSON.stringify({
              type: 'call-answered',
              from: data.from,
              accepted: data.accepted
            }));
            console.log(`Call ${data.accepted ? 'accepted' : 'declined'} by ${data.from}`);
          }
          break;
          
        case 'sdp-offer':
        case 'sdp-answer':
        case 'ice-candidate':
          // Forward WebRTC signaling messages
          const recipientClient = clients.get(data.to);
          if (recipientClient) {
            recipientClient.send(JSON.stringify({
              type: data.type,
              from: data.from,
              to: data.to,
              data: data.data
            }));
            console.log(`Forwarding ${data.type} from ${data.from} to ${data.to}`);
          } else {
            console.log(`Recipient ${data.to} not found for ${data.type}`);
          }
          break;
          
        case 'call-established':
          // Notify both peers that call is established
          const establishCallerClient = clients.get(data.from);
          const establishReceiverClient = clients.get(data.to);
          
          if (establishCallerClient) {
            establishCallerClient.peer = data.to;
            establishCallerClient.send(JSON.stringify({
              type: 'call-established',
              from: data.from,
              to: data.to
            }));
          }
          
          if (establishReceiverClient) {
            establishReceiverClient.peer = data.from;
            establishReceiverClient.send(JSON.stringify({
              type: 'call-established',
              from: data.from,
              to: data.to
            }));
          }
          
          console.log(`Call established between ${data.from} and ${data.to}`);
          break;
          
        case 'call-ended':
          // Notify both peers that call has ended
          const endCallerClient = clients.get(data.from);
          const endReceiverClient = clients.get(data.to);
          
          if (endCallerClient) {
            endCallerClient.peer = null;
            endCallerClient.send(JSON.stringify({
              type: 'call-ended',
              from: data.from,
              to: data.to,
              reason: data.reason || 'user-ended'
            }));
          }
          
          if (endReceiverClient) {
            endReceiverClient.peer = null;
            endReceiverClient.send(JSON.stringify({
              type: 'call-ended',
              from: data.from,
              to: data.to,
              reason: data.reason || 'user-ended'
            }));
          }
          
          console.log(`Call ended between ${data.from} and ${data.to} - Reason: ${data.reason}`);
          break;
          
        case 'mute-toggle':
          const muteRecipientClient = clients.get(data.to);
          if (muteRecipientClient) {
            muteRecipientClient.send(JSON.stringify({
              type: 'mute-toggle',
              from: data.from,
              to: data.to,
              data: data.data
            }));
            console.log(`Mute toggle: ${data.data.enabled} from ${data.from} to ${data.to}`);
          } else {
            console.log(`Recipient ${data.to} not found for mute-toggle`);
          }
          break;
          
        case 'video-toggle':
          const videoRecipientClient = clients.get(data.to);
          if (videoRecipientClient) {
            videoRecipientClient.send(JSON.stringify({
              type: 'video-toggle',
              from: data.from,
              to: data.to,
              data: data.data
            }));
            console.log(`Video toggle: ${data.data.enabled} from ${data.from} to ${data.to}`);
          } else {
            console.log(`Recipient ${data.to} not found for video-toggle`);
          }
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    if (ws.email) {
      // If user was in a call, find their peer and notify them
      for (const [email, client] of clients.entries()) {
        if (client.peer === ws.email) {
          client.send(JSON.stringify({
            type: 'call-ended',
            from: ws.email,
            to: email,
            reason: 'user-logout'
          }));
          client.peer = null;
          break;
        }
      }
      
      clients.delete(ws.email);
      console.log(`User disconnected: ${ws.email}`);
    }
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Basic health check endpoint


// Get connected users
app.get('/users', (req, res) => {
  const users = Array.from(clients.keys());
  res.json({ users });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for WebRTC signaling`);
}); 