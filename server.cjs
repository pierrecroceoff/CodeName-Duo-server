// ... (milieu du code) ...

  socket.on('disconnect', () => {
    // Find rooms where this socket was a player
    for (const [roomId, room] of Object.entries(rooms)) {
        if (room.players.P1.socketId === socket.id) {
            room.players.P1.connected = false;
        } else if (room.players.P2.socketId === socket.id) {
            room.players.P2.connected = false;
        } else {
            continue;
        }
 
        // Notify remaining player of disconnection (Optional: could add UI for this)
        io.to(roomId).emit('game_updated', {
            state: room.state,
            players: {
                P1: { connected: !!room.players.P1.connected },
                P2: { connected: !!room.players.P2.connected }
            }
        });
    }
    console.log('User disconnected:', socket.id);
  });
}); // <--- CETTE ACCOLADE FERME io.on('connection')

// **********************************************
// ********* CORRECTION CI-DESSOUS **************
// **********************************************

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Ajout de l'hôte pour accepter les connexions externes (téléphone)

server.listen(PORT, HOST, () => { // Modification : Ajout de HOST
  console.log(`Server running on http://${HOST}:${PORT}`); // Modification : Affichage de l'hôte et du port
});