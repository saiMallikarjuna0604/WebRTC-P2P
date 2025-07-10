# WebRTC Calling App - Frontend

A modern React.js application for P2P video calling with WebRTC technology.

## Features

- **Simple Login**: Use `alice@yopmail.com` or `bob@yopmail.com` to login
- **P2P Video Calling**: Direct peer-to-peer video and audio communication
- **Call States**: Idle, calling, ringing, connected, ended
- **Auto Timeout**: Calls automatically end after 10 seconds if not answered
- **Video/Audio Controls**: Toggle video and audio with visual feedback
- **Profile Pictures**: Shows profile icons when video is turned off
- **Mute Indicators**: Visual indicators for muted audio
- **Responsive Design**: Works on desktop and mobile devices

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- Backend server running on port 3001

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Testing with Two Users

1. **Start Backend Server** (in backend directory):
```bash
cd ../backend
npm start
```

2. **Start Frontend** (in frontend directory):
```bash
npm start
```

3. **Open Two Browser Windows**:
   - **Alice**: Open Chrome and go to `http://localhost:3000`
   - **Bob**: Open Chrome Incognito and go to `http://localhost:3000`

4. **Login**:
   - Alice: Enter `alice@yopmail.com`
   - Bob: Enter `bob@yopmail.com`

5. **Make a Call**:
   - Alice clicks "Start Call" button
   - Bob receives incoming call notification
   - Bob clicks "Accept" to join the call
   - Both users can now see and hear each other

### Call Controls

- **Video Toggle**: Turn video on/off (shows profile picture when off)
- **Audio Toggle**: Mute/unmute audio (shows mute indicator)
- **End Call**: Terminate the call for both users

### Call States

- **Idle**: Ready to make or receive calls
- **Calling**: Initiating a call (10-second timeout)
- **Ringing**: Receiving an incoming call (10-second timeout)
- **Connected**: Active video/audio call
- **Ended**: Call has been terminated

## Technical Details

- **Frontend**: React.js with hooks
- **Styling**: Custom CSS with modern design
- **WebRTC**: Peer-to-peer video/audio streaming
- **Signaling**: WebSocket communication with backend
- **ICE Servers**: Google STUN servers for NAT traversal

## File Structure

```
src/
├── App.js          # Main application component
├── App.css         # Application styles
├── index.js        # Application entry point
└── index.css       # Global styles
```

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Troubleshooting

1. **Camera/Microphone Access**: Ensure browser permissions are granted
2. **WebSocket Connection**: Verify backend server is running on port 3001
3. **Video Not Showing**: Check camera permissions and browser console for errors
4. **Call Not Connecting**: Ensure both users are logged in and backend is accessible

## Development

To modify the application:

1. Edit `src/App.js` for functionality changes
2. Edit `src/App.css` for styling changes
3. The app will automatically reload when you save changes

## Production Build

To create a production build:

```bash
npm run build
```

This creates an optimized build in the `build` folder.
