import React from 'react';
import { LayoutDashboard, Users, UserPlus, Calendar, Heart, CreditCard, Users2, LogOut, Menu, X, Baby } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${
      active ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { isAdmin, user } = useFirebase();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'directory', label: 'Member Directory', icon: <Users size={20} /> },
    { id: 'children', label: 'Children', icon: <Baby size={20} /> },
    { id: 'family-tree', label: 'Family Tree', icon: <UserPlus size={20} />, adminOnly: true },
    { id: 'events', label: 'Events', icon: <Calendar size={20} /> },
    { id: 'donations', label: 'Donations', icon: <Heart size={20} />, adminOnly: true },
    { id: 'annual-fees', label: 'Annual Fees', icon: <CreditCard size={20} />, adminOnly: true },
    { id: 'teams', label: 'Teams', icon: <Users2 size={20} /> },
  ];

  const handleLogout = () => signOut(auth);

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-64 bg-gray-900 text-white flex flex-col z-50 transition-transform duration-300 transform
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-indigo-400">MPBS Ahmedabad</h1>
            <p className="text-xs text-gray-500 mt-1">Community Portal</p>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            (!item.adminOnly || isAdmin) && (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => handleTabClick(item.id)}
              />
            )
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.email}</p>
              <p className="text-xs text-gray-500 uppercase">{isAdmin ? 'Admin' : 'Member'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full p-3 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between z-30">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <h1 className="font-bold text-gray-900">MPBS Ahmedabad</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.email?.[0].toUpperCase()}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
