import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateEvent from "./pages/CreateEvent";
import Teams from "./pages/Teams";
import Fixtures from "./pages/Fixtures";
import EventDetail from "./pages/EventDetail";
//import AuthGate from "./auth/AuthGate";

function App() {
  return (
    //<AuthGate>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/create-event" element={<CreateEvent />} />

          <Route path="/teams" element={<Teams />} />

          <Route path="/fixtures" element={<Fixtures />} />
          <Route path="/events/:id" element={<EventDetail />} />
        </Routes>
      </BrowserRouter>
    //</AuthGate>
  );
}

export default App;
