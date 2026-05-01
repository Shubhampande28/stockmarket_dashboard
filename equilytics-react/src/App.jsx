import Navbar from "./components/Navbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import BottomNav from "./components/BottomNav.jsx";
import ScreenerPage from "./pages/ScreenerPage.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-ink-950 text-text-primary">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-accent-blue/15 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-accent-green/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent-red/10 blur-3xl" />
      </div>

      <Navbar />

      <div className="mx-auto grid w-full max-w-[1760px] grid-cols-1 gap-4 px-4 pb-24 pt-24 md:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:pb-6">
        <Sidebar />
        <ScreenerPage />
      </div>

      <BottomNav />
    </div>
  );
}
