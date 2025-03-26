import { useState, ReactNode, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { 
  Home, Package, FileText, RefreshCw, Package2, BarChart2, 
  Scale, TrendingUp, Settings as SettingsIcon, Menu, Bell, 
  User, Waves, Zap, Move, GripHorizontal, Boxes, GitCompare,
  Scan, Smartphone, Tag, X as CloseIcon, LineChart
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [location, setLocation] = useLocation();

  // Effetto per chiudere automaticamente la sidebar su dispositivi mobili quando cambia la pagina
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location, isMobile]);

  const isActive = (path: string) => {
    return location === path;
  };
  
  const handleNavClick = (path: string) => {
    if (isMobile) {
      setSidebarOpen(false);
    }
    setLocation(path);
  };
  
  const navItems = [
    { icon: <Home className="h-5 w-5 mr-2" />, label: "Dashboard", path: "/" },
    { icon: <Waves className="h-5 w-5 mr-2" />, label: "Unità FLUPSY", path: "/flupsys" },
    { icon: <Move className="h-5 w-5 mr-2" />, label: "Gestione Posizioni", path: "/flupsy-positions" },
    { icon: <GitCompare className="h-5 w-5 mr-2" />, label: "Confronto FLUPSY", path: "/flupsy-comparison" },
    { icon: <Package className="h-5 w-5 mr-2" />, label: "Gestione Ceste", path: "/baskets" },
    { icon: <Scan className="h-5 w-5 mr-2" />, label: "FlupsyScan Mobile", path: "/nfc-scan" },
    { icon: <Tag className="h-5 w-5 mr-2" />, label: "Gestione Tag NFC", path: "/nfc-tags" },
    { icon: <FileText className="h-5 w-5 mr-2" />, label: "Operazioni", path: "/operations" },
    { icon: <Zap className="h-5 w-5 mr-2" />, label: "Operazioni Rapide", path: "/quick-operations" },
    { icon: <GripHorizontal className="h-5 w-5 mr-2" />, label: "Operazioni Drag&Drop", path: "/operations-drag-drop" },
    { icon: <RefreshCw className="h-5 w-5 mr-2" />, label: "Cicli Produttivi", path: "/cycles" },
    { icon: <Package2 className="h-5 w-5 mr-2" />, label: "Gestione Lotti", path: "/lots" },
    { icon: <Boxes className="h-5 w-5 mr-2" />, label: "Inventario Giacenze", path: "/inventory" },
    { icon: <BarChart2 className="h-5 w-5 mr-2" />, label: "Statistiche", path: "/statistics" },
    { icon: <Scale className="h-5 w-5 mr-2" />, label: "Tabella Taglie", path: "/sizes" },
    { icon: <TrendingUp className="h-5 w-5 mr-2" />, label: "Indici SGR", path: "/sgr" },
    { icon: <LineChart className="h-5 w-5 mr-2" />, label: "Percorso di Crescita", path: "/grow-journey" },
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

      <div className="flex flex-1 overflow-hidden relative">
        {/* Overlay su mobile quando il menu è aperto */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <aside
          className={`bg-white w-80 md:w-64 shadow-lg transition-all duration-300 ease-in-out overflow-y-auto scrollbar-hide ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed md:static h-[calc(100vh-60px)] z-40`}>
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="font-semibold text-lg">Menu</h2>
            {isMobile && (
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md hover:bg-gray-100 focus:outline-none"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <a
                key={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.path);
                }}
                href={item.path}
                className={`flex items-center p-3 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer ${
                  isActive(item.path) ? "bg-primary-light/10 text-primary" : "text-gray-700"
                }`}>
                {item.icon}
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-3 md:p-6 w-full">
          <div className={`transition-all duration-300 ${isMobile && sidebarOpen ? 'opacity-50' : 'opacity-100'}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
