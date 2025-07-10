# WebRTC Video Calling Application

A real-time video calling application built with WebRTC, React, and Node.js that enables peer-to-peer video communication through browsers.

## Features

- 🎥 Real-time video and audio calling
- 👥 Dynamic user registration with email
- 🔄 Online users list
- 🎮 Call controls (mute/unmute, video on/off)
- 🔔 Call notifications
- 🚪 Proper call cleanup on user logout
- 🔒 Secure peer-to-peer communication
- 🎨 Modern and responsive UI

## Tech Stack

### Frontend
- React.js (v19.1.0)
- WebRTC API
- CSS3 with modern styling
- Testing libraries (Jest, React Testing Library)

### Backend
- Node.js
- Express.js
- WebSocket (ws)
- CORS support

## Project Structure

```
webrtc-calling-app/
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   └── src/
│       ├── App.js         # Main application component
│       ├── App.css        # Application styles
│       ├── index.js       # Entry point
│       └── index.css      # Global styles
└── backend/
    ├── server.js          # WebSocket & HTTP server
    └── package.json       # Backend dependencies
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Modern web browser with WebRTC support

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd webrtc-calling-app
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
npm install
```

## Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```
The server will start on port 3001.

2. Start the frontend development server:
```bash
cd frontend
npm start
```
The application will open in your default browser at `http://localhost:3000`.

## WebRTC Implementation Details

### Signaling Flow
1. User registers with email through WebSocket connection
2. Caller initiates call to selected user
3. Receiver gets incoming call notification
4. Upon acceptance, WebRTC peer connection is established
5. Media streams are exchanged directly between peers

### Connection Phases
1. **Signaling Setup**: Exchange contact and session details
2. **ICE Candidate Gathering**: Discover network addresses
3. **ICE Candidate Exchange**: Share network addresses
4. **ICE Candidate Pairing**: Test connection combinations
5. **DTLS Handshake**: Establish secure connection
6. **Media Flow**: Start audio/video streaming

## API Endpoints

### Backend Server

#### WebSocket Events
- `register`: Register new user with email
- `call-request`: Initiate call to user
- `call-answer`: Accept/reject incoming call
- `sdp-offer`: Send WebRTC offer
- `sdp-answer`: Send WebRTC answer
- `ice-candidate`: Exchange ICE candidates
- `call-established`: Notify call connection
- `call-ended`: End active call
- `mute-toggle`: Toggle audio state
- `video-toggle`: Toggle video state

#### HTTP Endpoints
- `GET /users`: Get list of online users

## Security Features

- Email validation for user registration
- CORS enabled for API security
- Secure WebRTC peer connections with DTLS
- Proper cleanup of media streams and connections

## Browser Support

The application is tested and supported on:
- Google Chrome (latest)
- Mozilla Firefox (latest)
- Microsoft Edge (latest)
- Safari (latest)

## Development Guidelines

1. **Code Style**
   - Use modern JavaScript features
   - Follow React best practices
   - Maintain consistent formatting

2. **Testing**
   - Write unit tests for components
   - Test WebRTC connection flows
   - Verify media stream handling

3. **Error Handling**
   - Implement proper error boundaries
   - Handle WebRTC connection failures
   - Manage media device errors

## Known Limitations

1. **Network Constraints**
   - May not work behind symmetric NATs
   - Requires TURN servers for certain networks
   - Limited by browser's WebRTC implementation

2. **Browser Support**
   - Some features may not work in older browsers
   - Mobile browser support varies

## Future Improvements

1. **Features**
   - Screen sharing capability
   - Group video calls
   - Chat functionality
   - Call recording
   - Background blur/effects

2. **Technical**
   - Implement TURN server support
   - Add end-to-end encryption
   - Improve connection recovery
   - Optimize media quality

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the ISC License.

## Acknowledgments

- WebRTC.org for protocol documentation
- React team for the framework
- Open source community for various tools and libraries 
