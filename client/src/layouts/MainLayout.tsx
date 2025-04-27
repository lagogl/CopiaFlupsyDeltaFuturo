import { useState, ReactNode, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { 
  Home, Package, FileText, RefreshCw, Package2, BarChart2, 
  Scale, TrendingUp, Settings as SettingsIcon, Menu, Bell, 
  User, Waves, Zap, Move, GripHorizontal, Boxes, GitCompare,
  Scan, Smartphone, Tag, X as CloseIcon, LineChart, ChevronDown,
  ChevronRight, LayoutDashboard, PieChart, BarChart, Filter,
  FileJson, Download, Database, Leaf
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MarineWeather } from "@/components/MarineWeather";
import NotificationBell from "@/components/NotificationBell";

interface MainLayoutProps {
  children: ReactNode;
}

// Definizione del tipo per le voci di menu
interface NavItem {
  icon: JSX.Element;
  label: string;
  path: string;
  badge?: number | string;
}

// Definizione del tipo per le categorie di menu
interface NavCategory {
  id: string;
  label: string;
  icon: JSX.Element;
  color: string;
  items: NavItem[];
  expanded?: boolean;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [location, setLocation] = useLocation();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'operational': true,
    'monitoring': true,
    'inventory': true,
    'analysis': true,
    'system': true
  });

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
  
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };
  
  // Definizione delle categorie e delle relative voci di menu
  const navCategories: NavCategory[] = [
    {
      id: 'operational',
      label: 'GESTIONE OPERATIVA',
      icon: <LayoutDashboard className="h-5 w-5" />,
      color: 'text-blue-600',
      items: [
        { icon: <Home className="h-6 w-6 mr-2 text-black font-bold" />, label: "Dashboard", path: "/" },
        { icon: <Package2 className="h-5 w-5 mr-2 text-blue-600" />, label: "Gestione Lotti", path: "/lots" },
        { icon: <Package className="h-5 w-5 mr-2 text-blue-600" />, label: "Gestione Ceste", path: "/baskets" },
        { icon: <Move className="h-5 w-5 mr-2 text-blue-600" />, label: "Gestione Posizioni", path: "/flupsy-positions" },
        { icon: <FileText className="h-5 w-5 mr-2 text-blue-600" />, label: "Operazioni", path: "/operations" },
        { icon: <Zap className="h-5 w-5 mr-2 text-blue-600" />, label: "Operazioni Rapide", path: "/quick-operations" },
        { icon: <GripHorizontal className="h-5 w-5 mr-2 text-blue-600" />, label: "Operazioni Drag&Drop", path: "/operations-drag-drop" },
        { icon: <Filter className="h-5 w-5 mr-2 text-blue-600" />, label: "Vagliatura", path: "/selection" },
        { icon: <Scan className="h-5 w-5 mr-2 text-blue-600" />, label: "FlupsyScan Mobile", path: "/nfc-scan" }
      ]
    },
    {
      id: 'monitoring',
      label: 'MONITORAGGIO',
      icon: <Waves className="h-5 w-5" />,
      color: 'text-green-600',
      items: [
        { icon: <Waves className="h-5 w-5 mr-2 text-green-600" />, label: "Unità FLUPSY", path: "/flupsys" },
        { icon: <GitCompare className="h-5 w-5 mr-2 text-green-600" />, label: "Confronto FLUPSY", path: "/flupsy-comparison" },
        { icon: <LineChart className="h-5 w-5 mr-2 text-green-600" />, label: "Percorso di Crescita", path: "/grow-journey" },
        { icon: <BarChart2 className="h-5 w-5 mr-2 text-green-600" />, label: "Selezione Avanzata", path: "/basket-selection" }
      ]
    },
    {
      id: 'inventory',
      label: 'INVENTARIO',
      icon: <Boxes className="h-5 w-5" />,
      color: 'text-orange-600',
      items: [
        { icon: <RefreshCw className="h-5 w-5 mr-2 text-orange-600" />, label: "Cicli Produttivi", path: "/cycles" },
        { icon: <Scale className="h-5 w-5 mr-2 text-orange-600" />, label: "Tabella Taglie", path: "/sizes" },
        { icon: <Boxes className="h-5 w-5 mr-2 text-orange-600" />, label: "Inventario Giacenze", path: "/inventory" },
        { icon: <FileJson className="h-5 w-5 mr-2 text-orange-600" />, label: "Esportazione", path: "/export" }
      ]
    },
    {
      id: 'analysis',
      label: 'ANALISI',
      icon: <PieChart className="h-5 w-5" />,
      color: 'text-purple-600',
      items: [
        { icon: <BarChart className="h-5 w-5 mr-2 text-purple-600" />, label: "Statistiche", path: "/statistics" },
        { icon: <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />, label: "Indici SGR", path: "/sgr" },
        { icon: <FileText className="h-5 w-5 mr-2 text-purple-600" />, label: "Diario di Bordo", path: "/diario-di-bordo" },
        { icon: <Leaf className="h-5 w-5 mr-2 text-purple-600" />, label: "Impatto Ambientale", path: "/eco-impact" }
      ]
    },
    {
      id: 'system',
      label: 'SISTEMA',
      icon: <SettingsIcon className="h-5 w-5" />,
      color: 'text-gray-600',
      items: [
        { icon: <Tag className="h-5 w-5 mr-2 text-gray-600" />, label: "Gestione Tag NFC", path: "/nfc-tags" },
        { icon: <SettingsIcon className="h-5 w-5 mr-2 text-gray-600" />, label: "Impostazioni", path: "/settings" },
        { icon: <Bell className="h-5 w-5 mr-2 text-gray-600" />, label: "Gestione Notifiche", path: "/notification-settings" },
        { icon: <Database className="h-5 w-5 mr-2 text-gray-600" />, label: "Backup Database", path: "/backup" }
      ]
    }
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
          <div className="flex-1 flex justify-center">
            <MarineWeather />
          </div>
          <div className="flex items-center space-x-4">
            <NotificationBell />
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
          } fixed md:static h-[calc(100vh-60px)] z-40 ${!sidebarOpen ? "md:hidden" : ""}`}>
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
          <nav className="p-3 space-y-2">
            {navCategories.map((category) => (
              <div key={category.id} className="space-y-1">
                {/* Header della categoria */}
                <div 
                  className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer ${category.color} hover:bg-gray-100 transition-colors`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center">
                    <div className={`p-1 rounded-md mr-2 ${category.color.replace('text-', 'bg-').replace('600', '100')}`}>
                      {category.icon}
                    </div>
                    <span className="font-medium text-sm">{category.label}</span>
                  </div>
                  {expandedCategories[category.id] ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </div>

                {/* Voci del menù in questa categoria */}
                {expandedCategories[category.id] && (
                  <div className="ml-2 space-y-1 border-l-2 pl-2" style={{ borderColor: `var(--${category.color.split('-')[1]}-300)` }}>
                    {category.items.map((item) => (
                      <a
                        key={item.path}
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavClick(item.path);
                        }}
                        href={item.path}
                        className={`flex items-center p-2 rounded-md hover:bg-gray-100 transition-colors cursor-pointer ${
                          item.path === '/' 
                            ? 'text-base font-bold bg-gray-100 hover:bg-gray-200 text-black' 
                            : `text-sm ${
                                isActive(item.path) 
                                  ? `bg-${category.color.split('-')[1]}-50 ${category.color} font-medium` 
                                  : "text-gray-700"
                              }`
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className={`ml-auto px-2 py-0.5 text-xs font-medium rounded-full ${category.color.replace('text-', 'bg-')} text-white`}>
                            {item.badge}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto bg-gray-100 p-1 md:p-3 ${sidebarOpen ? "md:ml-0" : "ml-0"} transition-all duration-300 w-full`}>
          <div className={`transition-all duration-300 ${isMobile && sidebarOpen ? 'opacity-50' : 'opacity-100'} space-y-2`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
