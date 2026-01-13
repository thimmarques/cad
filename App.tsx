import React, { useState, useEffect, useCallback } from 'react';
import { Client, ClientStats } from './types';
import { analyzeClientBase } from './services/geminiService';
import { StatsCard } from './components/StatsCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { LogOut } from 'lucide-react';

// Icons using SVG strings for simplicity
const Icons = {
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
  ),
  Magic: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
  ),
  Bot: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
  ),
  LogOut: () => (
    <LogOut size={20} />
  )
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [clients, setClients] = useState<Client[]>([]);

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'clients'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
    } else {
      setClients(data || []);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchClients();
    }
  }, [session, fetchClients]);


  const stats: ClientStats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    inactive: clients.filter(c => c.status === 'inactive').length,
    pending: clients.filter(c => c.status === 'pending').length,
  };

  const chartData = [
    { name: 'Ativo', value: stats.active, color: '#10b981' },
    { name: 'Pendente', value: stats.pending, color: '#f59e0b' },
    { name: 'Inativo', value: stats.inactive, color: '#ef4444' },
  ];

  const handleAddOrEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      company: formData.get('company') as string,
      status: formData.get('status') as Client['status'],
      notes: formData.get('notes') as string,
    };

    if (editingClient) {
      const { error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', editingClient.id);

      if (error) {
        alert("Erro ao atualizar cliente.");
      } else {
        fetchClients();
        closeModal();
      }
    } else {
      const { error } = await supabase
        .from('clients')
        .insert([clientData]);

      if (error) {
        alert("Erro ao cadastrar cliente.");
      } else {
        fetchClients();
        closeModal();
      }
    }
  };

  const deleteClient = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) {
        alert("Erro ao excluir cliente.");
      } else {
        fetchClients();
      }
    }
  };

  const openModal = (client?: Client) => {
    if (client) setEditingClient(client);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingClient(null);
    setIsModalOpen(false);
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const result = await analyzeClientBase(clients);
      setAnalysis(result);
    } catch (error) {
      alert("Erro ao analisar dados.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-slate-900 text-white p-6 flex flex-col sticky top-0 h-auto lg:h-screen">
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Icons.Users />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Smart CRM</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${currentTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <span className="w-5 h-5 flex items-center justify-center">🏠</span>
            <span className="font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => setCurrentTab('clients')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${currentTab === 'clients' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <span className="w-5 h-5 flex items-center justify-center">👥</span>
            <span className="font-medium">Clientes</span>
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10">
          <p className="text-xs text-slate-500 uppercase font-semibold mb-4">Ações Rápidas</p>
          <button
            onClick={() => openModal()}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            <Icons.Plus />
            <span>Novo Cliente</span>
          </button>

          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center space-x-2 mt-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-4 rounded-xl transition-colors border border-white/5"
          >
            <Icons.LogOut />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">Visão Geral</h2>
            <p className="text-slate-500">Gerencie seus contatos e parcerias com inteligência.</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleAnalyze}
              disabled={isLoading || clients.length === 0}
              className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Icons.Bot />
              <span>Análise de IA</span>
            </button>
          </div>
        </header>

        {currentTab === 'dashboard' ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <StatsCard label="Total de Clientes" value={stats.total} icon={<Icons.Users />} color="bg-blue-100 text-blue-600" />
              <StatsCard label="Ativos" value={stats.active} icon={<div className="w-6 h-6 rounded-full bg-emerald-500"></div>} color="bg-emerald-100 text-emerald-600" />
              <StatsCard label="Pendentes" value={stats.pending} icon={<div className="w-6 h-6 rounded-full bg-amber-500"></div>} color="bg-amber-100 text-amber-600" />
              <StatsCard label="Inativos" value={stats.inactive} icon={<div className="w-6 h-6 rounded-full bg-rose-500"></div>} color="bg-rose-100 text-rose-600" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Distribution Chart */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-lg text-slate-800 mb-6">Distribuição por Status</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-around mt-4">
                  {chartData.map((d) => (
                    <div key={d.name} className="flex flex-col items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                        <span className="text-xs font-bold text-slate-500 uppercase">{d.name}</span>
                      </div>
                      <span className="text-lg font-bold text-slate-800">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Management Tip */}
              <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 flex flex-col justify-center">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Icons.Magic />
                  </div>
                  <h4 className="font-bold">Dica de Gestão</h4>
                </div>
                <p className="text-indigo-100 text-sm leading-relaxed mb-4">
                  Mantenha seus dados sempre atualizados para obter as melhores análises estratégicas da nossa IA.
                </p>
                <button className="text-white text-xs font-bold underline underline-offset-4 hover:text-indigo-200 transition-colors w-fit">
                  Saber mais
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {/* Table Container */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-800">Lista de Clientes</h3>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button className="px-3 py-1 bg-white shadow-sm rounded-md text-xs font-semibold text-slate-800">Todos</button>
                  <button className="px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">Recentes</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Nome / Empresa</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Contato</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                              <Icons.Users />
                            </div>
                            <p className="text-slate-400 font-medium">Nenhum cliente cadastrado.</p>
                            <p className="text-slate-300 text-sm">Adicione um novo cliente para começar.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      clients.map((client) => (
                        <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-slate-200 mr-3 flex items-center justify-center text-slate-500 font-bold uppercase">
                                {client.name.substring(0, 2)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-tight">{client.name}</p>
                                <p className="text-xs text-slate-500">{client.company}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${client.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                              client.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                              {client.status === 'active' ? 'Ativo' : client.status === 'pending' ? 'Pendente' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-600 font-medium">{client.email}</p>
                            <p className="text-xs text-slate-400">{client.phone}</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openModal(client)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              >
                                <Icons.Edit />
                              </button>
                              <button
                                onClick={() => deleteClient(client.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              >
                                <Icons.Trash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <p className="text-slate-500 text-sm mt-1">Preencha as informações abaixo para continuar.</p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-2">✕</button>
            </div>

            <form onSubmit={handleAddOrEdit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                  <input
                    name="name"
                    required
                    defaultValue={editingClient?.name}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Empresa</label>
                  <input
                    name="company"
                    required
                    defaultValue={editingClient?.company}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Ex: Tech Solutions"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={editingClient?.email}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Telefone</label>
                  <input
                    name="phone"
                    required
                    defaultValue={editingClient?.phone}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                  <select
                    name="status"
                    defaultValue={editingClient?.status || 'active'}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="active">Ativo</option>
                    <option value="pending">Pendente</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Observações</label>
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={editingClient?.notes}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Informações adicionais sobre o cliente..."
                  ></textarea>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all"
                >
                  {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
