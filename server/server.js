const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./database');
const { analyzeIncident, translateAndTriageGuestMessage } = require('./ai');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PATCH"]
  }
});

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/api/incidents', (req, res) => {
  db.all("SELECT * FROM incidents ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Parse JSON string fields back to objects for frontend
    const parsedRows = rows.map(row => ({
      ...row,
      ai_action_plan: row.ai_action_plan ? JSON.parse(row.ai_action_plan) : null
    }));
    res.json(parsedRows);
  });
});

app.get('/api/incidents/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM incidents WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }
    res.json({
      ...row,
      ai_action_plan: row.ai_action_plan ? JSON.parse(row.ai_action_plan) : null
    });
  });
});

app.post('/api/incidents', async (req, res) => {
  const { title, description, zone } = req.body;
  
  // Create incident with pending status
  db.run(`INSERT INTO incidents (title, description, zone, status) VALUES (?, ?, ?, 'pending_analysis')`, 
    [title, description, zone], 
    async function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const newId = this.lastID;
      
      // Notify clients of new unanalyzed incident
      db.get("SELECT * FROM incidents WHERE id = ?", [newId], (err, row) => {
        if (!err && row) io.emit('incident_update', row);
      });

      res.status(202).json({ id: newId, message: 'Incident reported, analysis pending.' });

      // Run AI analysis asynchronously
      const analysis = await analyzeIncident(title, description);
      
      // Update database with AI results
      db.run(`UPDATE incidents SET severity = ?, category = ?, ai_action_plan = ?, status = 'active' WHERE id = ?`,
        [analysis.severity, analysis.category, analysis.actionPlan, newId],
        (updateErr) => {
          if (!updateErr) {
            // Fetch updated incident and broadcast
            db.get("SELECT * FROM incidents WHERE id = ?", [newId], (fetchErr, updatedRow) => {
              if (!fetchErr && updatedRow) {
                updatedRow.ai_action_plan = updatedRow.ai_action_plan ? JSON.parse(updatedRow.ai_action_plan) : null;
                io.emit('incident_update', updatedRow);
              }
            });
          }
        }
      );
  });
});

app.patch('/api/incidents/:id/resolve', (req, res) => {
  const { id } = req.params;
  db.run("UPDATE incidents SET status = 'resolved' WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    db.get("SELECT * FROM incidents WHERE id = ?", [id], (fetchErr, row) => {
      if (!fetchErr && row) {
        row.ai_action_plan = row.ai_action_plan ? JSON.parse(row.ai_action_plan) : null;
        io.emit('incident_update', row);
        res.json(row);
      } else {
        res.status(404).json({ error: 'Incident not found' });
      }
    });
  });
});

app.get('/api/guests', (req, res) => {
  db.all("SELECT * FROM guests ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/guests', async (req, res) => {
  const { name, zone, status, message } = req.body;
  const guestName = name || 'Anonymous Guest';
  
  // Quick insert with original message
  db.run(`INSERT INTO guests (name, zone, status, original_message, priority_level) VALUES (?, ?, ?, ?, ?)`, 
    [guestName, zone, status, message, status === 'trapped' ? 'High' : 'Low'], 
    async function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const guestId = this.lastID;
      
      // Broadcast initial guest status immediately
      db.get("SELECT * FROM guests WHERE id = ?", [guestId], (err, row) => {
        if (!err && row) io.emit('guest_update', row);
      });

      res.status(202).json({ id: guestId, message: 'Check-in received' });

      // If trapped, automatically create an incident to show on the Dashboard
      if (status === 'trapped') {
        const incidentTitle = `TRAPPED GUEST: ${guestName}`;
        const incidentDesc = `Guest reported trapped via mobile portal. Message: "${message || 'No message provided.'}"`;
        
        db.run(`INSERT INTO incidents (title, description, zone, status) VALUES (?, ?, ?, 'pending_analysis')`, 
          [incidentTitle, incidentDesc, zone], 
          async function(incErr) {
            if (!incErr) {
              const newIncId = this.lastID;
              db.get("SELECT * FROM incidents WHERE id = ?", [newIncId], (err, row) => {
                if (!err && row) io.emit('incident_update', row);
              });
              
              // Run AI analysis on the trapped guest incident
              const analysis = await analyzeIncident(incidentTitle, incidentDesc);
              
              db.run(`UPDATE incidents SET severity = ?, category = ?, ai_action_plan = ?, status = 'active' WHERE id = ?`,
                ['Critical', 'Security', analysis.actionPlan, newIncId],
                (updateErr) => {
                  if (!updateErr) {
                    db.get("SELECT * FROM incidents WHERE id = ?", [newIncId], (fetchErr, updatedRow) => {
                      if (!fetchErr && updatedRow) {
                        updatedRow.ai_action_plan = updatedRow.ai_action_plan ? JSON.parse(updatedRow.ai_action_plan) : null;
                        io.emit('incident_update', updatedRow);
                      }
                    });
                  }
                }
              );
            }
        });
      }

      // If there's a message, run AI triage & translation asynchronously for the Guest record
      if (message) {
        const triage = await translateAndTriageGuestMessage(message);
        
        db.run(`UPDATE guests SET translated_message = ?, priority_level = ? WHERE id = ?`,
          [triage.translatedMessage, status === 'safe' ? 'Low' : triage.priorityLevel, guestId],
          (updateErr) => {
            if (!updateErr) {
              db.get("SELECT * FROM guests WHERE id = ?", [guestId], (fetchErr, updatedRow) => {
                if (!fetchErr && updatedRow) {
                  io.emit('guest_update', updatedRow);
                }
              });
            }
          }
        );
      }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
