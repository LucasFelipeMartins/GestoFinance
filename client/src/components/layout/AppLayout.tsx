import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-bg-app">
      <Sidebar />
      <div className="lg:pl-[250px]">
        <Header />
        <main>
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
