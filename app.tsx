import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { PlayAI } from './pages/PlayAI';
import { MultiplayerLobby } from './pages/MultiplayerLobby';
import { GameRoom } from './pages/GameRoom';
import { Profile } from './pages/Profile';
import { GameHistory } from './pages/GameHistory';
import { Leaderboard } from './pages/Leaderboard';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/play-ai" element={<PlayAI />} />
        <Route path="/multiplayer" element={<MultiplayerLobby />} />
        <Route path="/room/:roomId" element={<GameRoom />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/history" element={<GameHistory />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </BrowserRouter>
  );
}
