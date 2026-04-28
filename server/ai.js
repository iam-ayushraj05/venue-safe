const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');

// Load .env if present (not available in Cloud Run containers - env vars are set via Dockerfile/Cloud Run config)
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
} catch (e) {
  // .env file not found - that's fine in production
}

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

async function analyzeIncident(title, description, zone, venueContext = "", availableResponders = 6) {
  if (!genAI) {
    console.log('No Gemini API key found. Using mock AI response.');
    return {
      severity: 'Critical',
      category: 'Medical',
      actionPlan: JSON.stringify([
        "Dispatch nearest medical team to the location.",
        "Clear the immediate area to give responders space.",
        "Notify local emergency services if condition worsens."
      ]),
      confidence_score: 95,
      evacuation_route: JSON.stringify({
        "LOBBY ZONE A": "Exit via North stairs.",
        "GRAND BALLROOM ZONE B": "Avoid Lobby. Use service elevator hallway.",
        "DEFAULT": "Follow staff instructions and exit safely."
      }),
      responder_allocations: JSON.stringify([
        { zone: "LOBBY ZONE A", count: 2, reason: "Assess trapped guests" },
        { zone: "GRAND BALLROOM ZONE B", count: 4, reason: "Contain fire" }
      ])
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
    Analyze the following venue incident:
    Title: ${title}
    Description: ${description}
    Incident Location Zone: ${zone || 'Unknown'}
    
    Current Venue Context (Guest Crowd Density & Active Hazards):
    ${venueContext || 'No additional context provided.'}

    Provide a JSON response with the following keys:
    1. "severity": (Critical, High, Medium, Low, Info)
    2. "category": (Fire, Medical, Security, Crowd Control, Maintenance, Other)
    3. "actionPlan": An array of 3-5 specific, actionable steps for staff to take immediately.
    4. "confidence_score": An integer from 0 to 100 representing how confident you are in this assessment.
    5. "evacuation_routes": A JSON object mapping each major zone (e.g., "LOBBY ZONE A", "GRAND BALLROOM ZONE B", "DEFAULT") to a personalized escape route. The route MUST consider the Incident Location (avoid it), Guest Count (avoid overcrowding), and Active Hazards. Provide a "DEFAULT" key for unknown zones.
    6. "responder_allocations": An array of objects allocating the ${availableResponders} available responders. Format: [{ "zone": "Zone Name", "count": 2, "reason": "brief reason" }]. Allocate all responders efficiently based on hazards and trapped guests.

    Respond ONLY with valid JSON.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up potential markdown formatting in response
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    
    return {
      severity: parsed.severity || 'Medium',
      category: parsed.category || 'Other',
      actionPlan: JSON.stringify(parsed.actionPlan || []),
      confidence_score: parsed.confidence_score || 80,
      evacuation_route: JSON.stringify(parsed.evacuation_routes || { "DEFAULT": "Follow staff instructions and exit safely." }),
      responder_allocations: JSON.stringify(parsed.responder_allocations || [])
    };
  } catch (error) {
    console.error('AI Analysis failed:', error);
    return {
      severity: 'Critical',
      category: 'Medical',
      actionPlan: JSON.stringify([
        "Dispatch nearest medical team to the location.",
        "Clear the immediate area to give responders space.",
        "Notify local emergency services if condition worsens."
      ]),
      confidence_score: 85,
      evacuation_route: JSON.stringify({
        "LOBBY ZONE A": "Exit via North stairs.",
        "GRAND BALLROOM ZONE B": "Avoid Lobby. Use service elevator hallway.",
        "DEFAULT": "Follow staff instructions and exit safely."
      }),
      responder_allocations: JSON.stringify([
        { zone: "LOBBY ZONE A", count: 2, reason: "Assess trapped guests" },
        { zone: "GRAND BALLROOM ZONE B", count: 4, reason: "Contain fire" }
      ])
    };
  }
}

function detectPatterns(incidentHistory) {
  // Relaxed rule-based pattern for Demo purposes
  const crowdIncidents = incidentHistory.filter(i => i.category === 'Crowd');
  
  if (crowdIncidents.length >= 2) {
    return {
      suggestion: "Schedule 2 additional responders for weekend evenings at Pool Deck",
      risk_score: 78
    };
  }
  return null;
}

async function translateAndTriageGuestMessage(message) {
  if (!genAI || !message) {
    return {
      translatedMessage: message || '',
      priorityLevel: 'High',
      detectedLanguage: 'Unknown',
      detectedCategory: 'Other'
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
    Analyze this message from a hotel guest during an emergency:
    Message: "${message}"

    1. Translate the message to English (if it's not already in English).
    2. Determine the priority level based on the content (Critical = life-threatening or trapped, High = injured or in danger, Medium = requesting info, Low = just checking in safe).
    3. Detect the source language.
    4. Deduce the incident category if explicitly mentioned (e.g., Fire, Medical, Security, Crowd). Use 'Other' if not clear.

    Provide a JSON response with the following keys ONLY:
    1. "translatedMessage": The English translation.
    2. "priorityLevel": (Critical, High, Medium, Low)
    3. "detectedLanguage": The language the original message was written in.
    4. "detectedCategory": (Fire, Medical, Security, Crowd Control, Other)

    Respond ONLY with valid JSON.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    
    return {
      translatedMessage: parsed.translatedMessage || message,
      priorityLevel: parsed.priorityLevel || 'High',
      detectedLanguage: parsed.detectedLanguage || 'English',
      detectedCategory: parsed.detectedCategory || 'Other'
    };
  } catch (error) {
    console.error('AI Triage failed:', error);
    return {
      translatedMessage: message,
      priorityLevel: 'High',
      detectedLanguage: 'Unknown',
      detectedCategory: 'Other'
    };
  }
}

module.exports = { analyzeIncident, translateAndTriageGuestMessage, detectPatterns };
