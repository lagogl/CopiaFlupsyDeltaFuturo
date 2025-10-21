import { useState, ReactNode, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { 
  Home, Package, FileText, RefreshCw, Package2, BarChart2, 
  Scale, TrendingUp, Settings as SettingsIcon, Menu, Bell, 
  User, Waves, Zap, Move, Boxes, GitCompare,
  Tag, X as CloseIcon, LineChart, ChevronDown,
  ChevronRight, LayoutDashboard, PieChart, BarChart, BarChart3, Filter,
  FileJson, Download, Database, Leaf, LogOut, LayoutGrid,
  CloudIcon, Table, Brain, CalendarDays, Globe, History, FileSpreadsheet, Split
} from "lucide-react";
import useIsMobile from "@/hooks/use-mobile";
import { MarineWeather } from "@/components/MarineWeather";
import NotificationBell from "@/components/NotificationBell";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const { user, logout } = useAuth(); // Aggiungiamo l'hook useAuth
  const { translations, currentLanguage, changeLanguage } = useTranslation(); // Hook per traduzioni
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'operational': false,
    'monitoring': false,
    'inventory': false,
    'analysis': false,
    'sales': false,
    'system': false
  });

  // Effetto per gestire la sidebar in base alla pagina e al dispositivo
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      // Su desktop, nascondi automaticamente la sidebar quando si visualizza il Dashboard
      // per permettere una migliore visualizzazione delle mappe FLUPSY
      if (location === '/') {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
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
  
  // Definizione delle categorie e delle relative voci di menu con traduzioni
  const navCategories: NavCategory[] = [
    {
      id: 'operational',
      label: translations.categories.operational,
      icon: <LayoutDashboard className="h-5 w-5" />,
      color: 'text-blue-600',
      items: [
        { icon: <Home className="h-6 w-6 mr-2 text-black font-bold" />, label: translations.menuItems.dashboard, path: "/" },
        { icon: <Package2 className="h-5 w-5 mr-2 text-blue-600" />, label: translations.menuItems.lotManagement, path: "/lots" },
        { icon: <Package className="h-5 w-5 mr-2 text-blue-600" />, label: translations.menuItems.basketManagement, path: "/baskets" },
        { icon: <FileText className="h-5 w-5 mr-2 text-blue-600" />, label: translations.menuItems.operations, path: "/operations" },
        { icon: <Table className="h-5 w-5 mr-2 text-green-600" />, label: translations.menuItems.spreadsheetOperations, path: "/spreadsheet-operations" },
        { icon: <LayoutGrid className="h-5 w-5 mr-2 text-blue-600" />, label: translations.menuItems.screeningWithMap, path: "/vagliatura-con-mappa" },
        { icon: <History className="h-5 w-5 mr-2 text-blue-600" />, label: translations.menuItems.screeningHistory || "Storico Vagliature", path: "/screenings" },
        { icon: <Tag className="h-5 w-5 mr-2 text-blue-600" />, label: translations.menuItems.nfcTagManagement, path: "/nfc-tags" }
      ]
    },
    {
      id: 'monitoring',
      label: translations.categories.monitoring,
      icon: <Waves className="h-5 w-5" />,
      color: 'text-green-600',
      items: [
        { icon: <Waves className="h-5 w-5 mr-2 text-green-600" />, label: translations.menuItems.flupsyUnits, path: "/flupsys" },
        { icon: <GitCompare className="h-5 w-5 mr-2 text-green-600" />, label: translations.menuItems.flupsyComparison, path: "/flupsy-comparison" },
        { icon: <LineChart className="h-5 w-5 mr-2 text-green-600" />, label: translations.menuItems.growthPath, path: "/grow-journey" },
        { icon: <BarChart2 className="h-5 w-5 mr-2 text-green-600" />, label: translations.menuItems.advancedSelection, path: "/basket-selection" }
      ]
    },
    {
      id: 'inventory',
      label: translations.categories.inventory,
      icon: <Boxes className="h-5 w-5" />,
      color: 'text-orange-600',
      items: [
        { icon: <RefreshCw className="h-5 w-5 mr-2 text-orange-600" />, label: translations.menuItems.productionCycles, path: "/cycles" },
        { icon: <Scale className="h-5 w-5 mr-2 text-orange-600" />, label: translations.menuItems.sizeTable, path: "/sizes" },
        { icon: <Boxes className="h-5 w-5 mr-2 text-orange-600" />, label: translations.menuItems.stockInventory, path: "/inventory" },
        { icon: <CalendarDays className="h-5 w-5 mr-2 text-orange-600" />, label: translations.menuItems.stockRangeCalculation, path: "/giacenze-range" },
        { icon: <FileJson className="h-5 w-5 mr-2 text-orange-600" />, label: translations.menuItems.export, path: "/export" }
      ]
    },
    {
      id: 'analysis',
      label: translations.categories.analysis,
      icon: <PieChart className="h-5 w-5" />,
      color: 'text-purple-600',
      items: [
        { icon: <Brain className="h-5 w-5 mr-2 text-purple-600" />, label: translations.menuItems.aiDashboard, path: "/ai-dashboard" },
        { icon: <FileSpreadsheet className="h-5 w-5 mr-2 text-purple-600" />, label: translations.menuItems.aiReportGenerator, path: "/ai-report-generator" },
        { icon: <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />, label: translations.menuItems.aiGrowthVariability, path: "/growth-variability-analysis" },
        { icon: <BarChart className="h-5 w-5 mr-2 text-purple-600" />, label: translations.menuItems.statistics, path: "/statistics" },
        { icon: <BarChart2 className="h-5 w-5 mr-2 text-purple-600" />, label: translations.menuItems.lotsAnalytics, path: "/lots-analytics" },
        { icon: <Split className="h-5 w-5 mr-2 text-purple-600" />, label: translations.menuItems.mixedLotsAnalytics, path: "/mixed-lots-analytics" },
        { icon: <Filter className="h-5 w-5 mr-2 text-purple-600" />, label: translations.menuItems.lotLedgerStatistics, path: "/lot-ledger-statistics" },
        { icon: <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />, label: translations.menuItems.sgrIndices, path: "/sgr" },
        { icon: <PieChart className="h-5 w-5 mr-2 text-purple-600" />, label: translations.menuItems.salesReports, path: "/sales-reports" },
        { icon: <FileText className="h-5 w-5 mr-2 text-purple-600" />, label: translations.menuItems.plantDiary, path: "/diario-di-impianto" },
        { icon: <Leaf className="h-5 w-5 mr-2 text-purple-600" />, label: translations.menuItems.environmentalImpact, path: "/eco-impact" }
      ]
    },
    {
      id: 'sales',
      label: translations.categories.sales,
      icon: <Package className="h-5 w-5" />,
      color: 'text-emerald-600',
      items: [
        { icon: <Package className="h-5 w-5 mr-2 text-emerald-600" />, label: translations.menuItems.salesManagement, path: "/advanced-sales" }
      ]
    },
    {
      id: 'system',
      label: translations.categories.system,
      icon: <SettingsIcon className="h-5 w-5" />,
      color: 'text-gray-600',
      items: [
        { icon: <SettingsIcon className="h-5 w-5 mr-2 text-gray-600" />, label: translations.menuItems.settings, path: "/settings" },
        { icon: <Bell className="h-5 w-5 mr-2 text-gray-600" />, label: translations.menuItems.notificationManagement, path: "/notification-settings" },
        { icon: <CloudIcon className="h-5 w-5 mr-2 text-blue-600" />, label: translations.menuItems.invoicesInCloud, path: "/fatture-in-cloud" },
        { icon: <Database className="h-5 w-5 mr-2 text-gray-600" />, label: translations.menuItems.databaseBackup, path: "/backup" },
        { icon: <Zap className="h-5 w-5 mr-2 text-gray-600" />, label: translations.menuItems.adminUtilities, path: "/amministrazione-utilita" }
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white shadow-md z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-white">
              <Menu className="h-6 w-6" />
            </button>
            <img 
              src="/mito-logo.png" 
              alt="MITO SRL Logo" 
              className="h-12 w-12 object-contain"
            />
            <h1 className="text-xl font-condensed font-bold">{translations.title}</h1>
          </div>
          <div className="flex-1 flex justify-center">
            <MarineWeather />
          </div>
          <div className="flex items-center space-x-4">
            <NotificationBell />
            
            {/* Menu a tendina per l'utente */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center space-x-2 cursor-pointer hover:bg-primary-dark px-2 py-1 rounded-md">
                  <div className="h-8 w-8 rounded-full bg-primary-dark flex items-center justify-center text-white">
                    <span className="text-sm font-medium">
                      {user?.username ? user.username.substring(0, 2).toUpperCase() : "DF"}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{user?.username || "Utente"}</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>{translations.userDropdown.myAccount}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-gray-700 cursor-pointer"
                  onClick={() => setLocation("/settings")}
                >
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>{translations.userDropdown.settings}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={async () => {
                    try {
                      await logout();
                      // Non c'è bisogno di reindirizzare qui poiché la funzione di logout
                      // già reindirizza alla pagina di login
                    } catch (error) {
                      console.error("Errore durante il logout:", error);
                    }
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{translations.userDropdown.logout}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            <h2 className="font-semibold text-lg">{translations.menu}</h2>
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
          
          {/* Selettore di lingua in fondo alla sidebar */}
          <div className="p-4 border-t bg-gray-50">
            <div className="text-xs text-gray-500 mb-2 text-center">{translations.languageSelector.language}</div>
            <div className="flex justify-center space-x-1">
              <button
                onClick={() => changeLanguage('it')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  currentLanguage === 'it'
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <Globe className="h-3 w-3" />
                  <span>IT</span>
                </div>
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  currentLanguage === 'en'
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <Globe className="h-3 w-3" />
                  <span>EN</span>
                </div>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto bg-gray-100 p-1 md:p-3 ${sidebarOpen ? "md:ml-0" : "ml-0"} transition-all duration-300 w-full`}>
          <div className={`transition-all duration-300 ${isMobile && sidebarOpen ? 'opacity-50' : 'opacity-100'} space-y-2`}>
            {/* PWA Install Prompt */}
            <PWAInstallPrompt />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
