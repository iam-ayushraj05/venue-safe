const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./database');
const { analyzeIncident, translateAndTriageGuestMessage, detectPatterns } = require('./ai');

// Severity Escalation Engine
async function escalateIncident(incident) {
  if (incident.category === 'Fire' && incident.confidence_score >= 75) {
    // Simulated 911 dispatch
    console.log(`[911 DISPATCH SIM] Fire at ${incident.zone} - HIGH priority`);
    
    // Update dashboard
    io.emit('severity_alert', { 
      message: "AUTO-911 DISPATCHED - FULL LOCKDOWN INITIATED", 
      incident: incident 
    });
  }
}

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

      // Send response immediately so the request doesn't hang
      res.status(202).json({ id: newId, message: 'Incident created, analysis pending' });

      // Build venue context for AI
      db.all("SELECT zone, COUNT(*) as count FROM guests WHERE status = 'safe' GROUP BY zone", [], async (err, guestCounts) => {
        db.all("SELECT category, zone FROM incidents WHERE status = 'active'", [], async (err, activeHazards) => {
          
          let venueContext = "Crowd Density by Zone:\n";
          if (guestCounts && guestCounts.length > 0) {
            guestCounts.forEach(g => venueContext += `- ${g.zone}: ${g.count} guests\n`);
          } else {
            venueContext += "No active crowd data.\n";
          }
          
          venueContext += "\nActive Hazards:\n";
          if (activeHazards && activeHazards.length > 0) {
            activeHazards.forEach(h => venueContext += `- ${h.category} in ${h.zone}\n`);
          } else {
            venueContext += "None currently reported.\n";
          }

          // Run AI analysis asynchronously
          const analysis = await analyzeIncident(title, description, zone, venueContext);
          
          // Update database with AI results
          db.run(`UPDATE incidents SET severity = ?, category = ?, ai_action_plan = ?, confidence_score = ?, evacuation_route = ?, responder_allocations = ?, status = 'active' WHERE id = ?`,
            [analysis.severity, analysis.category, analysis.actionPlan, analysis.confidence_score || 0, analysis.evacuation_route || '', analysis.responder_allocations || '[]', newId],
            (updateErr) => {
              if (updateErr) console.error('UPDATE ERROR:', updateErr);
              if (!updateErr) {
                // Fetch updated incident and broadcast
                db.get("SELECT * FROM incidents WHERE id = ?", [newId], (fetchErr, updatedRow) => {
                  if (fetchErr) console.error('FETCH ERROR:', fetchErr);
                  if (!fetchErr && updatedRow) {
                    updatedRow.ai_action_plan = updatedRow.ai_action_plan ? JSON.parse(updatedRow.ai_action_plan) : null;
                    io.emit('incident_update', updatedRow);

                    // Check for auto-escalation
                    if (updatedRow.category === 'Fire' && updatedRow.confidence_score >= 75) {
                      escalateIncident(updatedRow);
                    }

                    // Pattern detection check
                    db.all("SELECT * FROM incidents", [], (err, rows) => {
                      if (!err) {
                        const pattern = detectPatterns(rows);
                        if (pattern) {
                          io.emit('pattern_detected', pattern);
                        }
                      }
                    });
                  }
                });
              }
            }
          );
        });
      });
  });
});

app.get('/api/muster', (req, res) => {
  db.all("SELECT * FROM muster_points", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/muster/checkin', (req, res) => {
  const { guest_name, qr_code, is_injured } = req.body;
  
  db.get("SELECT id, zone FROM muster_points WHERE qr_code = ?", [qr_code], (err, point) => {
    if (err || !point) return res.status(404).json({ error: 'Muster point not found' });
    
    db.run("INSERT INTO muster_checkins (guest_name, zone, muster_point_id, is_injured) VALUES (?, ?, ?, ?)",
      [guest_name, point.zone, point.id, is_injured ? 1 : 0], function(err) {
        if (!err) {
          db.run("UPDATE muster_points SET current_count = current_count + 1 WHERE id = ?", [point.id]);
          io.emit('muster_update', { point_id: point.id, zone: point.zone, guest_name });
          res.json({ success: true, message: 'Checked in successfully' });
        } else {
          res.status(500).json({ error: err.message });
        }
    });
  });
});

app.get('/api/responders', (req, res) => {
  db.all("SELECT * FROM responders", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
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

app.patch('/api/guests/:id/safe', (req, res) => {
  const { id } = req.params;
  db.run("UPDATE guests SET status = 'safe', priority_level = 'Low' WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get("SELECT * FROM guests WHERE id = ?", [id], (fetchErr, row) => {
      if (!fetchErr && row) {
        io.emit('guest_update', row);
        res.json(row);
      } else {
        res.status(404).json({ error: 'Guest not found' });
      }
    });
  });
});

app.post('/api/guests', async (req, res) => {
  const { name, zone, status, message, is_injured } = req.body;
  const guestName = name || 'Anonymous Guest';
  
  // Quick insert with original message
  db.run(`INSERT INTO guests (name, zone, status, original_message, priority_level, is_injured) VALUES (?, ?, ?, ?, ?, ?)`, 
    [guestName, zone, status, message, status === 'trapped' ? 'High' : 'Low', is_injured ? 1 : 0], 
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
              
              db.run(`UPDATE incidents SET severity = ?, category = ?, ai_action_plan = ?, responder_allocations = ?, status = 'active' WHERE id = ?`,
                ['Critical', 'Security', analysis.actionPlan, analysis.responder_allocations || '[]', newIncId],
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
        
        db.run(`UPDATE guests SET translated_message = ?, priority_level = ?, detected_language = ?, detected_category = ? WHERE id = ?`,
          [triage.translatedMessage, status === 'safe' ? 'Low' : triage.priorityLevel, triage.detectedLanguage, triage.detectedCategory, guestId],
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

app.post('/api/sms-webhook', async (req, res) => {
  const { From, Body } = req.body;
  if (!Body) return res.status(400).json({ error: 'No body' });

  const upperBody = Body.toUpperCase();
  const isHelp = upperBody.includes('HELP') || upperBody.includes('TRAPPED') || upperBody.includes('FIRE');
  const status = isHelp ? 'trapped' : 'safe';
  
  // Try to extract zone from text roughly, or default to unknown
  let zone = 'UNKNOWN ZONE';
  const zones = ['LOBBY', 'BALLROOM', 'RESTAURANT', 'POOL', 'CONFERENCE', 'SPA', 'PARKING'];
  for (const z of zones) {
    if (upperBody.includes(z)) {
      zone = `${z} ZONE`;
      break;
    }
  }

  // Insert guest
  db.run(`INSERT INTO guests (name, zone, status, original_message, priority_level, is_injured) VALUES (?, ?, ?, ?, ?, ?)`, 
    [From, zone, status, Body, status === 'trapped' ? 'High' : 'Low', 0], 
    async function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const guestId = this.lastID;
      db.get("SELECT * FROM guests WHERE id = ?", [guestId], (err, row) => {
        if (!err && row) io.emit('guest_update', row);
      });

      res.status(200).json({ success: true });

      if (status === 'trapped') {
        const incidentTitle = `SMS SOS: ${From}`;
        const incidentDesc = `SMS Received: "${Body}"`;
        
        db.run(`INSERT INTO incidents (title, description, zone, status) VALUES (?, ?, ?, 'pending_analysis')`, 
          [incidentTitle, incidentDesc, zone], 
          async function(incErr) {
            if (!incErr) {
              const newIncId = this.lastID;
              db.get("SELECT * FROM incidents WHERE id = ?", [newIncId], (err, row) => {
                if (!err && row) io.emit('incident_update', row);
              });
              
              const analysis = await analyzeIncident(incidentTitle, incidentDesc, zone, "");
              
              db.run(`UPDATE incidents SET severity = ?, category = ?, ai_action_plan = ?, responder_allocations = ?, status = 'active' WHERE id = ?`,
                ['Critical', 'Security', analysis.actionPlan, analysis.responder_allocations || '[]', newIncId],
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

      const triage = await translateAndTriageGuestMessage(Body);
      db.run(`UPDATE guests SET translated_message = ?, priority_level = ?, detected_language = ?, detected_category = ? WHERE id = ?`,
        [triage.translatedMessage, status === 'safe' ? 'Low' : triage.priorityLevel, triage.detectedLanguage, triage.detectedCategory, guestId],
        (updateErr) => {
          if (!updateErr) {
            db.get("SELECT * FROM guests WHERE id = ?", [guestId], (fetchErr, updatedRow) => {
              if (!fetchErr && updatedRow) io.emit('guest_update', updatedRow);
            });
          }
        }
      );
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
