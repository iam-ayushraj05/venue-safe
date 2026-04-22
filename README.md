# VenueSafe - Advanced Hospitality Crisis System

VenueSafe is a high-fidelity, full-stack crisis management platform for hospitality venues designed to bridge the communication gap between guests, staff, and emergency responders. Built specifically for the Solution Challenge, this system focuses on real-time incident tracking, AI-driven triage, and multi-modal communication, presented via a premium "Command Center" interface.

## 🚀 Features

*   **The "Bridge" Architecture**: Synchronizes three distinct, critical interfaces in real-time using WebSockets:
    1.  **Command Dashboard (Staff)**: Central hub with a tactical UI, live metrics, and real-time floorplan incident mapping.
    2.  **Guest Portal (Digital Muster)**: A mobile-friendly interface for guests to self-report their status ("Safe" or "Trapped") and send emergency distress messages.
    3.  **911 Responder View**: A secure, tactical dispatch portal providing first responders with immediate threat locations and priority-triaged victim lists before they even enter the building.
*   **AI Quick Triage Console**: Staff can rapidly input observations (e.g., "Guest collapsed in ballroom") which the system routes through Google Gemini 1.5 Pro to instantly generate a 3-step tactical response protocol.
*   **Automated Incident Detection**: When a guest reports themselves as "Trapped" via the portal, the system automatically triggers a Critical Incident on the main dashboard, alerting staff instantly.
*   **Multi-Lingual Distress Translation**: Guest emergency messages are automatically processed, translated to English, and triaged by AI to determine priority levels for responders.
*   **Facility Lockdown Override**: A one-click override system that broadcasts a facility-wide critical alert across all connected terminals.
*   **Cyberpunk/Tactical UI**: A highly polished, responsive interface featuring dynamic glowing elements, real-time latency tracking, and a wireframe radar map.

## 🛠️ Technology Stack

*   **Frontend**: React (Vite), React Router DOM, Lucide React (Icons), Custom Vanilla CSS.
*   **Backend**: Node.js, Express.js.
*   **Database**: SQLite3.
*   **Real-time Communication**: Socket.io.
*   **Artificial Intelligence**: Google Generative AI (Gemini 1.5 Pro).

## ⚙️ Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/SUDIPTO-2005/venue-safe.git
    cd venue-safe
    ```

2.  **Install Frontend Dependencies:**
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies:**
    ```bash
    cd server
    npm install
    cd ..
    ```

4.  **Configure Environment Variables:**
    Create a `.env` file in the `/server` directory and add your Google Gemini API Key:
    ```env
    GEMINI_API_KEY=your_google_gemini_api_key_here
    ```

5.  **Run the Application:**
    From the root directory (`venue-safe`), start both the frontend and backend servers simultaneously:
    ```bash
    npm run dev
    ```

## 🗺️ Application Routes

Once running, you can access the three core modules at the following local addresses:
*   **Command Center**: `http://localhost:5173/`
*   **Guest Portal**: `http://localhost:5173/guest`
*   **911 Responder**: `http://localhost:5173/responder`

## 💡 How to Test the System

1. Open the **Command Center** and leave it running on one screen.
2. Open the **Guest Portal** on your phone (or a separate browser window).
3. Select a zone, type a distress message, and hit **TRAPPED**.
4. Watch as the Command Center's map lights up red in that zone, the Active Incidents counter ticks up, and the **Responder Portal** updates with the translated, triaged message.
5. On the Command Center, click the new incident in the feed to view the automatically generated AI Rescue Plan.
