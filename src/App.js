/* eslint-disable default-case */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

function App() {
  const [email, setEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [callState, setCallState] = useState('idle');
  const [remoteUser, setRemoteUser] = useState('');
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [remoteVideoOn, setRemoteVideoOn] = useState(true);
  const [remoteAudioOn, setRemoteAudioOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);

  const wsRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const callIntervalRef = useRef(null);

  console.log('remoteVideoRef', remoteVideoRef);

  const WEBSOCKET_URL = 'ws://localhost:3001';

  const connectWebSocket = useCallback(() => {
    wsRef.current = new WebSocket(WEBSOCKET_URL);
    
    wsRef.current.onopen = () => {
      wsRef.current.send(JSON.stringify({
        type: 'register',
        email: email
      }));
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('onmessage', data);
      handleWebSocketMessage(data);
    };
  }, [email]);

  useEffect(() => {
    if (isLoggedIn) {
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isLoggedIn, connectWebSocket]);

  useEffect(() => {
    // Clear any existing interval
    if (callIntervalRef.current) {
      clearInterval(callIntervalRef.current);
      callIntervalRef.current = null;
    }

    if (callState === 'calling' || callState === 'ringing') {
      // Timeout timer (10 seconds)
      setCallDuration(0);
      callIntervalRef.current = setInterval(() => {
        setCallDuration(prev => {
          if (prev >= 10) {
            endCall('timeout');
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (callState === 'connected') {
      // Call duration timer
      setCallDuration(0);
      callIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      // Reset timer
      setCallDuration(0);
    }

    return () => {
      if (callIntervalRef.current) {
        clearInterval(callIntervalRef.current);
        callIntervalRef.current = null;
      }
    };
  }, [callState]);

  // Function to fetch online users
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/users');
      const data = await response.json();
      // Filter out current user
      setOnlineUsers(data.users.filter(user => user !== email));
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  }, [email]);

  // Fetch online users periodically when logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchOnlineUsers(); // Initial fetch
      const interval = setInterval(fetchOnlineUsers, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, fetchOnlineUsers]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleWebSocketMessage = (data) => {
    console.log('handleWebSocketMessage', data);
    switch (data.type) {
      case 'incoming-call':
        setCallState('ringing');
        setRemoteUser(data.from);
        break;
      
      case 'call-answered':
        if (data.accepted) {
          console.log('Call answered by', data.from);
          setCallState('connected');
          initializePeerConnection();
        } else {
          setCallState('idle');
          setRemoteUser('');
        }
        break;
      
      case 'call-established':
        setCallState('connected');
        break;
      
      case 'call-ended':
        cleanupCall();
        if (data.reason === 'user-logout') {
          alert(`${data.from} has logged out`);
        }
        setTimeout(() => {
          setCallState('idle');
          setRemoteUser('');
        }, 1000);
        break;
      
      case 'sdp-offer':
        handleSDPOffer(data);
        break;
      
      case 'sdp-answer':
        handleSDPAnswer(data);
        break;
      
      case 'ice-candidate':
        console.log('Received ICE candidate', data);
        handleICECandidate(data);
        break;
      
      case 'mute-toggle':
        setRemoteAudioOn(data.data.enabled);
        break;
      
      case 'video-toggle':
        setRemoteVideoOn(data.data.enabled);
        break;
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (email && email.includes('@')) {  // Basic email validation
      setIsLoggedIn(true);
    } else {
      alert('Please enter a valid email address');
    }
  };

  const initiateCall = async (targetEmail) => {
    if (!targetEmail) return;
    
    setRemoteUser(targetEmail);
    setCallState('calling');
    setShowUserList(false);
    
    wsRef.current.send(JSON.stringify({
      type: 'call-request',
      from: email,
      to: targetEmail
    }));
  };

  const answerCall = (accepted) => {
    wsRef.current.send(JSON.stringify({
      type: 'call-answer',
      from: email,
      to: remoteUser,
      accepted: accepted
    }));
    
    if (accepted) {
      setCallState('connected');
      initializePeerConnection();
    } else {
      setCallState('idle');
      setRemoteUser('');
    }
  };

  const endCall = useCallback((reason = 'user-ended') => {
    wsRef.current.send(JSON.stringify({
      type: 'call-ended',
      from: email,
      to: remoteUser,
      reason: reason
    }));
    
    cleanupCall();
    setTimeout(() => {
      setCallState('idle');
      setRemoteUser('');
    }, 1000);
  }, [email, remoteUser]);

  const initializePeerConnection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true
      });
      
      // Ensure audio and video tracks are enabled by default
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = true;
        setIsAudioOn(true);
      }
      
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = true;
        setIsVideoOn(true);
      }
      
      // Set up local video immediately
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Prevent echo
        localVideoRef.current.onloadedmetadata = () => {
          localVideoRef.current.play().catch(e => console.log('Local video play error:', e));
        };
      }

      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      peerConnectionRef.current = new RTCPeerConnection(configuration);

      console.log('peerConnectionRef.current', peerConnectionRef.current);
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      // Handle incoming remote stream
      peerConnectionRef.current.ontrack = (event) => {
        console.log('Received remote stream:', event.streams[0]);
        if (event.streams && event.streams[0]) {
          const remoteStream = event.streams[0];
          console.log('Remote tracks:', remoteStream.getTracks());
          
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.muted = false; // Ensure audio plays
            remoteVideoRef.current.onloadedmetadata = () => {
              console.log('Remote video ready, attempting to play');
              remoteVideoRef.current.play().catch(e => {
                console.error('Remote video play error:', e);
              });
            };
          }
        }
      };

      console.log('peerConnectionRef.current', peerConnectionRef.current);

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        console.log('onicecandidate', event);
        if (event.candidate) {
          wsRef.current.send(JSON.stringify({
            type: 'ice-candidate',
            from: email,
            to: remoteUser,
            data: event.candidate
          }));
        }
      };

      // Monitor connection state
      peerConnectionRef.current.onconnectionstatechange = () => {
        console.log('Connection state changed:', peerConnectionRef.current.connectionState);
      };

      // Create and send offer if caller
      // if (email === 'alice@yopmail.com') {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        
        wsRef.current.send(JSON.stringify({
          type: 'sdp-offer',
          from: email,
          to: remoteUser,
          data: offer
        }));
      // }
    } catch (error) {
      console.error('Error initializing peer connection:', error);
      alert('Error accessing camera/microphone: ' + error.message);
    }
  };

  const handleSDPOffer = async (data) => {
    try {
      if (!peerConnectionRef.current) {
        console.error('No peer connection available');
        await initializePeerConnection();
        // return;
      }
      
      console.log('Handling SDP offer...');
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.data));
      
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      console.log('Sending SDP answer...',answer);
      
      wsRef.current.send(JSON.stringify({
        type: 'sdp-answer',
        from: email,
        to: data.from,
        data: answer
      }));
    } catch (error) {
      console.error('Error handling SDP offer:', error);
    }
  };

  const handleSDPAnswer = async (data) => {
    try {
      if (!peerConnectionRef.current) {
        console.error('No peer connection available');
        return;
      }
      
      console.log('Handling SDP answer...');
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.data));
    } catch (error) {
      console.error('Error handling SDP answer:', error);
    }
  };

  const handleICECandidate = async (data) => {
    try {
      if (!peerConnectionRef.current) {
        // await initializePeerConnection();
        return;
      }
      console.log('Adding ICE candidate', data);
      
      if (!data.data) return;
      
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.data));
    } catch (error) {
      console.error('ICE candidate failed, reinitializing:', error);
      await peerConnectionRef.current.restartIce();
    }
  };

  const renegotiate = async () => {
    if (peerConnectionRef.current && peerConnectionRef.current.connectionState === 'connected') {
      try {
        console.log('Starting renegotiation...');
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        
        wsRef.current.send(JSON.stringify({
          type: 'sdp-offer',
          from: email,
          to: remoteUser,
          data: offer
        }));
      } catch (error) {
        console.error('Renegotiation error:', error);
      }
    }
  };

  const cleanupCall = () => {
    // Stop all media tracks
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const tracks = localVideoRef.current.srcObject.getTracks();
      tracks.forEach(track => {
        track.stop(); // This will turn off the camera/mic
      });
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      const tracks = remoteVideoRef.current.srcObject.getTracks();
      tracks.forEach(track => {
        track.stop();
      });
      remoteVideoRef.current.srcObject = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    setIsVideoOn(true);
    setIsAudioOn(true);
    setRemoteVideoOn(true);
    setRemoteAudioOn(true);
  };

  const handleLogout = () => {
    // If in a call, end it first
    if (callState !== 'idle' && remoteUser) {
      wsRef.current.send(JSON.stringify({
        type: 'call-ended',
        from: email,
        to: remoteUser,
        reason: 'user-logout'
      }));
    }

    // Clean up WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clean up any ongoing call
    cleanupCall();

    // Reset all states
    setIsLoggedIn(false);
    setEmail('');
    setCallState('idle');
    setRemoteUser('');
    setCallDuration(0);
    setOnlineUsers([]);
    setShowUserList(false);

    // Clear any intervals
    if (callIntervalRef.current) {
      clearInterval(callIntervalRef.current);
      callIntervalRef.current = null;
    }
  };

  const toggleVideo = async () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newVideoState = videoTrack.enabled;
        setIsVideoOn(newVideoState);
        
        console.log('Video track enabled:', videoTrack.enabled);
        
        // Send only one event
        wsRef.current.send(JSON.stringify({
          type: 'video-toggle',
          from: email,
          to: remoteUser,
          data: { enabled: newVideoState }
        }));
        
        // Renegotiate connection after track change
        await renegotiate();
      }
    }
  };

  const toggleAudio = async () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject;
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newAudioState = audioTrack.enabled;
        setIsAudioOn(newAudioState);
        
        console.log('Audio track enabled:', audioTrack.enabled);
        
        // Send only one event
        wsRef.current.send(JSON.stringify({
          type: 'mute-toggle',
          from: email,
          to: remoteUser,
          data: { enabled: newAudioState }
        }));
        
        // Renegotiate connection after track change
        await renegotiate();
      }
    }
  };

  const getProfileInitial = (userEmail) => {
    return userEmail === 'alice@yopmail.com' ? 'A' : 'B';
  };

  if (!isLoggedIn) {
    return (
      <div className="app">
        <div className="login-page">
          <div className="welcome-text">
            <h1>Welcome to Real-Time Connect</h1>
            <p>Experience seamless peer-to-peer video calling with crystal-clear quality and zero latency. Connect instantly, communicate effortlessly.</p>
          </div>
          <div className="login-container">
            <div className="login-illustration">👤</div>
            <h1>Member Login</h1>
            <form onSubmit={handleLogin} className="login-form">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="email-input"
              />
              <button type="submit" className="login-button">LOGIN</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h2>Welcome, {email}</h2>
        <div className="header-controls">
          <div className="call-status">
            {callState === 'idle' && <span className="status idle">Ready to call</span>}
            {callState === 'calling' && <span className="status calling">Calling {remoteUser}... ({10 - callDuration}s)</span>}
            {callState === 'ringing' && <span className="status ringing">Incoming call from {remoteUser} ({10 - callDuration}s)</span>}
            {callState === 'connected' && (
              <div className="connected-status">
                <span className="status connected">Connected with {remoteUser}</span>
                <span className="call-duration">⏱️ {formatTime(callDuration)}</span>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </div>

      <div className="video-container">
        <div className="video-wrapper">
          <div className="video-box">
            {callState === 'connected' ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="video-stream"
                  style={{ display: isVideoOn ? 'block' : 'none' }}
                />
                {!isVideoOn && (
                  <div className="profile-placeholder">
                    <div className="profile-icon">{getProfileInitial(email)}</div>
                    <div className="profile-name">{email}</div>
                  </div>
                )}
                {!isAudioOn && <div className="mute-indicator">🔇</div>}
              </div>
            ) : (
              <div className="waiting-placeholder">
                <div className="waiting-icon">📞</div>
                <div className="waiting-text">
                  {callState === 'calling' ? 'Calling...' : 
                   callState === 'ringing' ? 'Incoming call...' : 
                   'Waiting for call'}
                </div>
              </div>
            )}
            <div className="video-label">You</div>
          </div>
        </div>

        <div className="video-wrapper">
          <div className="video-box">
            {callState === 'connected' ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="video-stream"
                  style={{ display: remoteVideoOn ? 'block' : 'none' }}
                />
                {!remoteVideoOn && (
                  <div className="profile-placeholder">
                    <div className="profile-icon">{getProfileInitial(remoteUser)}</div>
                    <div className="profile-name">{remoteUser}</div>
                  </div>
                )}
                {!remoteAudioOn && <div className="mute-indicator">🔇</div>}
              </div>
            ) : (
              <div className="waiting-placeholder">
                <div className="waiting-icon">📞</div>
                <div className="waiting-text">
                  {callState === 'calling' ? 'Calling...' : 
                   callState === 'ringing' ? 'Incoming call...' : 
                   'Waiting for call'}
                </div>
              </div>
            )}
            <div className="video-label">{remoteUser || 'Remote User'}</div>
          </div>
        </div>
      </div>

      <div className="controls">
        {callState === 'idle' && (
          <button onClick={() => setShowUserList(true)} className="call-button">
            📞
          </button>
        )}

        {callState === 'ringing' && (
          <div className="call-actions">
            <button onClick={() => answerCall(true)} className="accept-button">
              ✅
            </button>
            <button onClick={() => answerCall(false)} className="decline-button">
              ❌
            </button>
          </div>
        )}

        {callState === 'connected' && (
          <div className="call-controls">
            <button onClick={toggleVideo} className={`control-button ${!isVideoOn ? 'active' : ''}`}>
              <span>{isVideoOn ? '📹' : '🚫'}</span>
              <span>Video</span>
            </button>
            <button onClick={toggleAudio} className={`control-button ${!isAudioOn ? 'active' : ''}`}>
              <span>{isAudioOn ? '🎤' : '🔇'}</span>
              <span>Audio</span>
            </button>
            <button onClick={() => endCall()} className="end-call-button">
              📞
            </button>
          </div>
        )}

        {(callState === 'calling' || callState === 'ringing') && (
          <button onClick={() => endCall('user-cancelled')} className="cancel-button">
            ❌
          </button>
        )}
      </div>

      {/* Online Users Modal */}
      {showUserList && (
        <div className="online-users-overlay" onClick={() => setShowUserList(false)}>
          <div className="online-users-container" onClick={e => e.stopPropagation()}>
            <div className="online-users-header">
              <h2>Online Users</h2>
              <button className="close-button" onClick={() => setShowUserList(false)}>×</button>
            </div>
            {onlineUsers.length > 0 ? (
              <div className="online-users-list">
                {onlineUsers.map(userEmail => (
                  <div key={userEmail} className="user-item" onClick={() => initiateCall(userEmail)}>
                    <div className="user-avatar">
                      {userEmail[0].toUpperCase()}
                    </div>
                    <div className="user-email">{userEmail}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-users-message">
                No other users are currently online
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
