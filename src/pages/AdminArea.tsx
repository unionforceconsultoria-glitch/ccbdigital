import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard, Printer, BarChart3, FolderUp, FolderOpen, Church, MessageCircle, ClipboardList } from "lucide-react";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminPrinting from "@/components/admin/AdminPrinting";
import AdminDistribution from "@/components/admin/AdminDistribution";
import AdminDocuments from "@/components/admin/AdminDocuments";
import AdminFileManager from "@/components/admin/AdminFileManager";
import AdminIgrejas from "@/components/admin/AdminIgrejas";
import AdminCobranca from "@/components/admin/AdminCobranca";
import AdminInventario from "@/components/admin/AdminInventario";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "arquivos", label: "Arquivos", icon: FolderOpen },
  { id: "impressao", label: "Impressão", icon: Printer },
  { id: "distribuicao", label: "Distribuição", icon: BarChart3 },
  { id: "documentos", label: "Documentos", icon: FolderUp },
  { id: "igrejas", label: "Igrejas", icon: Church },
  { id: "cobranca", label: "Cobrança", icon: MessageCircle },
  { id: "inventario", label: "Inventário", icon: ClipboardList },
] as const;

type TabId = (typeof tabs)[number]["id"];

const AdminArea: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-primary-foreground font-bold text-lg tracking-tight">
            Painel Administrativo
          </h1>
          <p className="text-primary-foreground/70 text-sm">Patrimônio CCB Digital · v2.1</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleLogout}
          className="text-primary-foreground/80 hover:text-primary-foreground p-2"
        >
          <LogOut className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="bg-background border-b border-border overflow-x-auto">
        <div className="max-w-[800px] mx-auto flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-3 px-2 text-xs font-semibold transition-colors relative ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="truncate">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-2 right-2 h-[3px] bg-primary rounded-t-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[800px] mx-auto p-4">
        {activeTab === "dashboard" && <AdminDashboard />}
        {activeTab === "arquivos" && <AdminFileManager />}
        {activeTab === "impressao" && <AdminPrinting />}
        {activeTab === "distribuicao" && <AdminDistribution />}
        {activeTab === "documentos" && <AdminDocuments />}
        {activeTab === "igrejas" && <AdminIgrejas />}
        {activeTab === "cobranca" && <AdminCobranca />}
        {activeTab === "inventario" && <AdminInventario />}
      </div>
    </div>
  );
};

export default AdminArea;
