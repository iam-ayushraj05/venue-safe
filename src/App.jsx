import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import GuestView from './pages/GuestView';
import ResponderPortal from './pages/ResponderPortal';
import MusterStation from './pages/MusterStation';
import { useEffect } from 'react';
import { socket } from './socket';

function App() {
  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {/* We keep these old routes active for the other views if needed, though they aren't linked directly in the new UI */}
        <Route path="/guest" element={<GuestView />} />
        <Route path="/responder" element={<ResponderPortal />} />
        <Route path="/muster" element={<MusterStation />} />
      </Routes>
    </Router>
  );
}

export default App;
