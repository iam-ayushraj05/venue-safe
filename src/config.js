// API base URL - in production, use the same origin; in dev, use the backend port
const API_BASE = import.meta.env.PROD
  ? window.location.origin
  : 'http://localhost:8080';

export default API_BASE;
