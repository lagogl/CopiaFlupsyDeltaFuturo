import { useState, ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { 
  Home, Package, FileText, RefreshCw, Package2, BarChart2, 
  Scale, TrendingUp, Settings as SettingsIcon, Menu, Bell, 
  User
} from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };
  
  const navItems = [
    { icon: <Home className="h-5 w-5 mr-2" />, label: "Dashboard", path: "/" },
    { icon: <Package className="h-5 w-5 mr-2" />, label: "Gestione Ceste", path: "/baskets" },
    { icon: <FileText className="h-5 w-5 mr-2" />, label: "Operazioni", path: "/operations" },
    { icon: <RefreshCw className="h-5 w-5 mr-2" />, label: "Cicli Produttivi", path: "/cycles" },
    { icon: <Package2 className="h-5 w-5 mr-2" />, label: "Gestione Lotti", path: "/lots" },
    { icon: <BarChart2 className="h-5 w-5 mr-2" />, label: "Statistiche", path: "/statistics" },
    { icon: <Scale className="h-5 w-5 mr-2" />, label: "Tabella Taglie", path: "/sizes" },
    { icon: <TrendingUp className="h-5 w-5 mr-2" />, label: "Indici SGR", path: "/sgr" },
    { icon: <SettingsIcon className="h-5 w-5 mr-2" />, label: "Impostazioni", path: "/settings" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white shadow-md z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-white">
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-condensed font-bold">FLUPSY Delta Futuro</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button className="flex items-center hover:bg-primary-dark p-2 rounded-md">
              <Bell className="h-5 w-5 mr-1" />
              <span className="text-sm">Notifiche</span>
            </button>
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-primary-dark flex items-center justify-center text-white">
                <span className="text-sm font-medium">DF</span>
              </div>
              <span className="text-sm font-medium">Admin</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`bg-white w-64 shadow-lg transition-all duration-300 ease-in-out overflow-y-auto scrollbar-hide ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed md:static h-[calc(100vh-60px)] z-40`}>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center p-3 rounded-lg hover:bg-gray-100 transition-colors ${
                  isActive(item.path) ? "bg-primary-light/10 text-primary" : "text-gray-700"
                }`}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
