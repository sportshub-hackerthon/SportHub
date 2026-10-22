
import CoachAuthGate from "./auth/AuthGate";
import CoachChatPage from "./pages/CoachChatPage";

export default function App() {
  return (
    <CoachAuthGate>
      <CoachChatPage />
    </CoachAuthGate>
  );
}
