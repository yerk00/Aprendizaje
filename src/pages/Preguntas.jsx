import React from "react";

export default function Preguntas() {
  const iframeStyles = {
    width: "100%",
    height: "600px",
    border: "2px solid #ccc",
    borderRadius: "10px",
    marginTop: "20px"
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#333" }}>Preguntas</h1>

      <iframe
        title="Reunión Jitsi"
        src="https://meet.jit.si/MiReunionPersonal123"
        style={iframeStyles}
        allow="camera; microphone; fullscreen; display-capture"
      ></iframe>
    </div>
  );
}
