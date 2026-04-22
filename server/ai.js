const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');

dotenv.config();

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

async function analyzeIncident(title, description) {
  if (!genAI) {
    console.log('No Gemini API key found. Using mock AI response.');
    return {
      severity: 'Critical',
      category: 'Medical',
      actionPlan: JSON.stringify([
        "Dispatch nearest medical team to the location.",
        "Clear the immediate area to give responders space.",
        "Notify local emergency services if condition worsens."
      ])
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const prompt = `
    Analyze the following venue incident:
    Title: ${title}
    Description: ${description}

    Provide a JSON response with the following keys:
    1. "severity": (Critical, High, Medium, Low, Info)
    2. "category": (Fire, Medical, Security, Crowd Control, Maintenance, Other)
    3. "actionPlan": An array of 3-5 specific, actionable steps for staff to take immediately.

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
      actionPlan: JSON.stringify(parsed.actionPlan || [])
    };
  } catch (error) {
    console.error('AI Analysis failed:', error);
    return {
      severity: 'Unknown',
      category: 'Unknown',
      actionPlan: '[]'
    };
  }
}

async function translateAndTriageGuestMessage(message) {
  if (!genAI || !message) {
    return {
      translatedMessage: message || '',
      priorityLevel: 'High'
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const prompt = `
    Analyze this message from a hotel guest during an emergency:
    Message: "${message}"

    1. Translate the message to English (if it's not already in English).
    2. Determine the priority level based on the content (Critical = life-threatening or trapped, High = injured or in danger, Medium = requesting info, Low = just checking in safe).

    Provide a JSON response with the following keys ONLY:
    1. "translatedMessage": The English translation.
    2. "priorityLevel": (Critical, High, Medium, Low)

    Respond ONLY with valid JSON.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    
    return {
      translatedMessage: parsed.translatedMessage || message,
      priorityLevel: parsed.priorityLevel || 'High'
    };
  } catch (error) {
    console.error('AI Triage failed:', error);
    return {
      translatedMessage: message,
      priorityLevel: 'High'
    };
  }
}

module.exports = { analyzeIncident, translateAndTriageGuestMessage };
