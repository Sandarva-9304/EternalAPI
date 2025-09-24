(async () => {
    const socket = io("http://localhost:3000"); // change if different host/port

    // UI elements
    const usernameInput = document.getElementById("username");
    const registerBtn = document.getElementById("registerBtn");
    const callBtn = document.getElementById("callBtn");
    const hangupBtn = document.getElementById("hangupBtn");
    const targetInput = document.getElementById("target");
    const localVideo = document.getElementById("localVideo");
    const remoteVideo = document.getElementById("remoteVideo");
    const usersList = document.getElementById("usersList");

    // ICE servers config: include your TURN server here
    const ICE_SERVERS = [
      { urls: "stun:stun.l.google.com:19302" }, // public STUN
      // Example TURN entry (replace with your credentials)
      {
        urls: "turn:YOUR_TURN_SERVER_IP:3478",
        username: "user1", // or use token-based auth depending on coturn setup
        credential: "pass1"
      }
    ];

    let localStream = null;
    let pc = null;         // RTCPeerConnection for the current call
    let localUsername = null;
    let currentCallTarget = null;

    registerBtn.onclick = () => {
      const name = usernameInput.value.trim();
      if (!name) return alert("Enter username");
      localUsername = name;
      socket.emit("register", name);
      registerBtn.disabled = true;
      usernameInput.disabled = true;
    };

    // show users list
    socket.on("users", (users) => {
      usersList.innerHTML = "";
      users.forEach(u => {
        const li = document.createElement("li");
        li.textContent = u + (u === localUsername ? " (you)" : "");
        usersList.appendChild(li);
      });
    });

    // helper: create RTCPeerConnection
    function createPeerConnection() {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (evt) => {
        if (evt.candidate) {
          socket.emit("ice-candidate", { to: currentCallTarget, from: localUsername, candidate: evt.candidate });
        }
      };

      pc.ontrack = (evt) => {
        remoteVideo.srcObject = evt.streams[0];
      };

      return pc;
    }

    // get local media
    async function ensureLocalStream() {
      if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
      }
      return localStream;
    }

    // initiate a call (caller)
    callBtn.onclick = async () => {
      const target = targetInput.value.trim();
      if (!target) return alert("Enter target username");
      if (!localUsername) return alert("Register first");

      currentCallTarget = target;
      pc = createPeerConnection();

      // add local tracks
      const stream = await ensureLocalStream();
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      // create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // send offer via signaling
      socket.emit("offer", { to: target, from: localUsername, offer });
    };

    // incoming offer (callee)
    socket.on("offer", async ({ from, offer }) => {
      // auto-answer behavior: prompt user to accept
      const accept = confirm(`Incoming call from ${from}. Accept?`);
      if (!accept) {
        console.log("Call rejected");
        return;
      }

      currentCallTarget = from;
      pc = createPeerConnection();

      // add local tracks
      const stream = await ensureLocalStream();
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      // set remote description (offer)
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // send answer back to caller
      socket.emit("answer", { to: from, from: localUsername, answer });
    });

    // incoming answer (caller receives)
    socket.on("answer", async ({ from, answer }) => {
      if (!pc) {
        console.warn("No RTCPeerConnection for answer");
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // ICE candidate from peer
    socket.on("ice-candidate", async ({ from, candidate }) => {
      if (!pc) {
        console.warn("No RTCPeerConnection; buffering candidates not implemented in this simple sample");
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    });

    hangupBtn.onclick = () => {
      if (pc) {
        pc.close();
        pc = null;
      }
      currentCallTarget = null;
      if (localStream) {
        for (const t of localStream.getTracks()) t.stop();
        localStream = null;
        localVideo.srcObject = null;
      }
    };
  })();