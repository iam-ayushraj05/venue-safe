import { io } from 'socket.io-client';
import API_BASE from './config';

// In production, connect to the same host that served the page
// In dev, connect to the local backend on port 8080
const URL = import.meta.env.PROD ? window.location.origin : API_BASE;

export const socket = io(URL, {
  autoConnect: true
});
