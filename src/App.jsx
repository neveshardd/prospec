import React, { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck, Trash2, History } from 'lucide-react';
import axios from 'axios';
import { 
  Search, MapPin, Star, AlertCircle, CheckCircle2, 
  TrendingUp, Mail, Phone, Info, Layout, Send, 
  User, Settings, Globe, ExternalLink, Copy, Check
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

const App = () => {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [savedLeads, setSavedLeads] = useState(JSON.parse(localStorage.getItem('wallet_leads') || '[]'));
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'wallet'
  const [selectedLead, setSelectedLead] = useState(null);
  const [apiKey, setApiKey] = useState(localStorage.getItem('serper_key') || '');
  const [showSettings, setShowSettings] = useState(!localStorage.getItem('serper_key'));
  const [userName, setUserName] = useState(localStorage.getItem('user_name') || '');
  const [userPortfolio, setUserPortfolio] = useState(localStorage.getItem('user_portfolio') || '');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem('wallet_leads', JSON.stringify(savedLeads));
  }, [savedLeads]);

  const toggleSaveLead = (lead) => {
    const isSaved = savedLeads.find(l => l.id === lead.id);
    if (isSaved) {
      setSavedLeads(savedLeads.filter(l => l.id !== lead.id));
    } else {
      setSavedLeads([{ ...lead, savedAt: new Date().toISOString() }, ...savedLeads]);
    }
  };

  const handleSearch = async (e) => {
    // ... (rest of search logic stays the same)
    e.preventDefault();
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    if (!query && !location) {
      setError("Por favor, preencha pelo menos o nicho ou a localização.");
      return;
    }
    
    setLoading(true);
    setLeads([]);
    
    // Cache Key
    const cacheKey = `cache_${query.toLowerCase()}_${location.toLowerCase()}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      console.log("Using cached results...");
      setLeads(JSON.parse(cachedData));
      setLoading(false);
      return;
    }
    
    try {
      const payload = {
        q: query,
        gl: 'br',
        hl: 'pt-br'
      };

      if (location) {
        payload.location = location;
      }

      const response = await axios.post('https://google.serper.dev/maps', payload, {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        }
      });

      console.log("API Response:", response.data);

      const results = response.data.places || response.data.maps || [];

      if (results.length === 0) {
        setLeads([]);
        setError(`A API não encontrou locais para "${query}" em "${location || 'Brasil'}".`);
        setLoading(false);
        return;
      }

      const analyzedLeads = results.map(place => {
        let score = 40;
        const pains = [];

        if (!place.website) {
          score += 40;
          pains.push("Sem Website profissional");
        }
        if (place.rating < 4.2) {
          score += 10;
          pains.push(`Reputação média (${place.rating || 'N/A'})`);
        }
        if ((place.ratingCount || 0) < 15) {
          score += 10;
          pains.push("Baixa prova social (poucas avaliações)");
        }

        return {
          id: place.placeId,
          name: place.title,
          niche: query,
          location: place.address,
          rating: place.rating || 0,
          reviews: place.ratingCount || 0,
          hasWebsite: !!place.website,
          website: place.website,
          opportunityScore: Math.min(score, 100),
          painPoints: pains.length > 0 ? pains : ["Presença online básica"],
          phone: place.phoneNumber || "Não informado",
        };
      }).sort((a, b) => b.opportunityScore - a.opportunityScore);

      // Save to Cache
      localStorage.setItem(cacheKey, JSON.stringify(analyzedLeads));
      
      setLeads(analyzedLeads);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Erro na busca. Verifique sua chave de API ou conexão.');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const data = {
      wallet: savedLeads,
      settings: { userName, userPortfolio }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leadgen_database_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.wallet) setSavedLeads(data.wallet);
        if (data.settings) {
          if (data.settings.userName) setUserName(data.settings.userName);
          if (data.settings.userPortfolio) setUserPortfolio(data.settings.userPortfolio);
        }
        alert("Banco de dados importado com sucesso!");
      } catch (err) {
        setError("Arquivo de banco de dados inválido.");
      }
    };
    reader.readAsText(file);
  };

  const saveSettings = () => {
    localStorage.setItem('serper_key', apiKey);
    localStorage.setItem('user_name', userName);
    localStorage.setItem('user_portfolio', userPortfolio);
    setShowSettings(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-slate-100">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-[#0b0f1a]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="text-white size-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">LeadGen <span className="text-indigo-500">Pro</span></span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <Settings className="size-5" />
            </button>
            <div className="h-8 w-[1px] bg-slate-800"></div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-slate-300">API Ativa</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Section */}
        <section className="mb-12">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent italic tracking-tighter">
              ENCONTRE CLIENTES QUE PRECISAM DE VOCÊ.
            </h1>
            <p className="text-slate-400 text-lg">Localize empresas com baixa presença digital e venda seu serviço hoje mesmo.</p>
          </div>

          <form onSubmit={handleSearch} className="glass-card p-2 flex flex-col md:flex-row gap-2 max-w-5xl mx-auto shadow-indigo-500/5 shadow-2xl">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 size-5" />
              <input 
                type="text" 
                placeholder="Nicho (ex: Pizzarias, Dentistas...)"
                className="w-full bg-transparent border-none py-4 pl-12 pr-4 focus:ring-0 text-white placeholder-slate-600"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="w-[1px] bg-slate-800 hidden md:block my-2"></div>
            <div className="flex-1 relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 size-5" />
              <input 
                type="text" 
                placeholder="Cidade ou Bairro"
                className="w-full bg-transparent border-none py-4 pl-12 pr-4 focus:ring-0 text-white placeholder-slate-600"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <button className="btn-indigo px-8 py-4 md:w-auto w-full" disabled={loading}>
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <Send className="size-4" />
                  Buscar Leads
                </>
              )}
            </button>
          </form>
        </section>

        {/* Results Grid */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
            <div className="flex gap-8">
              <button 
                onClick={() => setActiveTab('search')}
                className={`text-sm font-bold transition-all relative py-2 ${activeTab === 'search' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <div className="flex items-center gap-2 uppercase tracking-widest">
                  <Search className="size-4" /> Resultados ({leads.length})
                </div>
                {activeTab === 'search' && <Motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
              </button>
              <button 
                onClick={() => setActiveTab('wallet')}
                className={`text-sm font-bold transition-all relative py-2 ${activeTab === 'wallet' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <div className="flex items-center gap-2 uppercase tracking-widest">
                  <Bookmark className="size-4" /> Carteira ({savedLeads.length})
                </div>
                {activeTab === 'wallet' && <Motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Leads List */}
            <div className="lg:col-span-7 space-y-4">
              {loading ? (
                <div className="py-20 text-center">
                  <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-400 font-medium">Escaneando infraestruturas...</p>
                </div>
              ) : (activeTab === 'search' ? leads : savedLeads).length === 0 ? (
                <div className="border-2 border-dashed border-slate-800 rounded-3xl p-16 text-center">
                  <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-slate-800">
                    <History className="text-slate-600 size-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-300">
                    {activeTab === 'search' ? 'Nenhum resultado ainda' : 'Sua carteira está vazia'}
                  </h3>
                  <p className="text-slate-500 mt-2">
                    {activeTab === 'search' 
                      ? 'Use a barra acima para garimpar empresas reais.' 
                      : 'Favorite os melhores leads para que eles apareçam aqui.'}
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {(activeTab === 'search' ? leads : savedLeads).map((lead) => (
                  <Motion.div
                    key={lead.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedLead(lead)}
                    className={`p-5 rounded-2xl cursor-pointer transition-all border group ${
                      selectedLead?.id === lead.id 
                      ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10' 
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold group-hover:text-indigo-400 transition-colors">{lead.name}</h3>
                        <p className="text-slate-500 text-sm mt-1 flex items-center gap-1">
                          <MapPin className="size-3" /> {lead.location}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        lead.opportunityScore > 70 ? 'bg-emerald-500/20 text-emerald-400' : 
                        lead.opportunityScore > 50 ? 'bg-amber-500/20 text-amber-400' : 
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {lead.opportunityScore}% Oportunidade
                      </div>
                    </div>
                    
                    <div className="flex gap-6 mt-5 pt-4 border-t border-slate-800/50">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        {lead.hasWebsite ? <CheckCircle2 className="text-emerald-500 size-3.5" /> : <AlertCircle className="text-rose-500 size-3.5" />}
                        <span>Website</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Star className="text-amber-500 fill-amber-500 size-3.5" />
                        <span>{lead.rating} ({lead.reviews})</span>
                      </div>
                    </div>
                  </Motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

            {/* Details Sidebar */}
          <div className="lg:col-span-5 h-fit lg:sticky lg:top-24">
            <AnimatePresence mode="wait">
              {selectedLead ? (
                <Motion.div
                  key={selectedLead.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="glass-card p-6 overflow-y-auto max-h-[calc(100vh-120px)] scrollbar-thin"
                >
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Diagnóstico Técnico</span>
                      <button 
                        onClick={() => toggleSaveLead(selectedLead)}
                        className={`p-2 rounded-lg transition-all ${savedLeads.find(l => l.id === selectedLead.id) ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        title={savedLeads.find(l => l.id === selectedLead.id) ? 'Remover da Carteira' : 'Salvar na Carteira'}
                      >
                        {savedLeads.find(l => l.id === selectedLead.id) ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                      </button>
                    </div>
                    <h2 className="text-xl font-black italic tracking-tighter uppercase leading-none truncate">{selectedLead.name}</h2>
                    <div className="flex items-center gap-3 mt-3">
                      {selectedLead.website && (
                        <a href={selectedLead.website} target="_blank" rel="noreferrer" className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded text-indigo-400 hover:bg-indigo-500/20 transition-all flex items-center gap-1">
                          <ExternalLink className="size-3" /> Analisar Site
                        </a>
                      )}
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Phone className="size-3" /> {selectedLead.phone}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest">Gaps de Infraestrutura</h4>
                      <div className="space-y-1.5">
                        {selectedLead.painPoints.map((point, i) => (
                          <div key={i} className="flex items-center gap-2 p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-lg text-[11px] text-rose-200">
                            <AlertCircle className="size-3.5 shrink-0 text-rose-500" />
                            {point}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl relative group">
                      <h4 className="text-[10px] font-bold text-indigo-500 uppercase mb-4 tracking-widest flex items-center gap-2">
                        <Send className="size-3" /> Sequência de Mensagens (WhatsApp)
                      </h4>
                      
                      <div className="space-y-4">
                        {(() => {
                          const hour = new Date().getHours();
                          const saudacao = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
                          const nome = userName || '[Seu Nome]';
                          const portfolio = userPortfolio ? ` (Aqui está meu trabalho: ${userPortfolio})` : '';
                          
                          let msg1 = `${saudacao}! Tudo bem? Me chamo ${nome}. Gostaria de parabenizar pelo trabalho na ${selectedLead.name}, as avaliações de vocês são excelentes!`;
                          let msg2 = "";
                          let msg3 = "";

                          if (!selectedLead.hasWebsite) {
                            msg2 = `Estava analisando a infraestrutura digital aqui da região de ${selectedLead.location.split(',')[0]} e notei que vocês ainda não possuem uma plataforma própria para conversão.`;
                            msg3 = `Como desenvolvedor, eu consigo construir um sistema robusto para vocês não dependerem apenas de redes sociais. Podemos conversar?${portfolio}`;
                          } else {
                            msg2 = `Como desenvolvedor, notei que podemos escalar seu faturamento automatizando processos através de uma plataforma personalizada ou sistema inteligente.`;
                            msg3 = `O objetivo é reduzir o trabalho manual da equipe e aumentar as vendas via software. Teria 5 minutos?${portfolio}`;
                          }

                          return [msg1, msg2, msg3].map((msg, i) => (
                            <div key={i} className="group/msg relative bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                              <span className="text-[9px] font-bold text-slate-500 absolute -top-2 left-3 bg-[#161d2b] px-1">MSG {i+1}</span>
                              <p className="text-[11px] text-slate-300 italic leading-relaxed pr-8">"{msg}"</p>
                              <button 
                                onClick={() => copyToClipboard(msg)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-indigo-500/20 rounded-lg transition-all text-slate-500 hover:text-indigo-400"
                                title="Copiar Mensagem"
                                id={`copy-msg-${i}`}
                                key={`btn-copy-${i}`}
                              >
                                {copied === msg ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                              </button>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                      {(() => {
                        const clean = selectedLead.phone.replace(/\D/g, '');
                        const isMobile = (clean.length === 11 && clean[2] === '9') || (clean.length === 13 && clean[4] === '9');
                        const waNumber = clean.startsWith('55') ? clean : `55${clean}`;
                        
                        return (
                          <div className="grid grid-cols-2 gap-3">
                            <a 
                              href={`tel:${clean}`}
                              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[11px]"
                            >
                              <Phone className="size-3" /> Ligar Agora
                            </a>
                            <div className="flex flex-col gap-1">
                              <a 
                                href={`https://wa.me/${waNumber}`}
                                target="_blank"
                                rel="noreferrer"
                                className={`font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[11px] ${isMobile ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 opacity-70'}`}
                              >
                                <Send className="size-3" /> {isMobile ? 'WhatsApp (Celular)' : 'WhatsApp (Provável Fixo)'}
                              </a>
                              {!isMobile && (
                                <a 
                                  href={`https://www.google.com/search?q=${encodeURIComponent(selectedLead.name + " whatsapp " + selectedLead.location.split(',')[0])}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[9px] text-indigo-400 hover:text-indigo-300 text-center flex items-center justify-center gap-1 mt-1"
                                >
                                  <Search className="size-2.5" /> Procurar celular no Google
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                </Motion.div>
              ) : (
                <div className="border-2 border-dashed border-slate-800 rounded-3xl p-20 text-center lg:sticky lg:top-24">
                  <Info className="text-slate-800 size-10 mx-auto mb-4" />
                  <p className="text-slate-500 text-xs font-medium">Selecione um lead para ver o raio-x técnico.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </main>

      {/* Error Modal */}
      <AnimatePresence>
        {error && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <Motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 border border-rose-500/30 p-8 rounded-3xl max-w-md w-full shadow-2xl shadow-rose-500/10"
            >
              <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center mb-6">
                <AlertCircle className="text-rose-500 size-6" />
              </div>
              <h2 className="text-2xl font-black tracking-tighter mb-2 text-rose-100">ERRO NA OPERAÇÃO</h2>
              <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                {error}
              </p>
              <button 
                onClick={() => setError(null)}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
              >
                Entendido
              </button>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <Motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl shadow-indigo-500/10"
            >
              <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-6">
                <Settings className="text-indigo-500 size-6" />
              </div>
              <h2 className="text-2xl font-black tracking-tighter mb-2">CONFIGURAÇÃO</h2>
              <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                Para buscar leads reais, insira sua chave do **Serper.dev**. É rápido e gratuito para começar.
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Sua API Key (Serper)</label>
                  <input 
                    type="password" 
                    placeholder="********************************"
                    className="input-primary"
                    onChange={(e) => setApiKey(e.target.value)}
                    value={apiKey}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Seu Nome</label>
                    <input 
                      type="text" 
                      placeholder="Ex: João Silva"
                      className="input-primary py-2"
                      onChange={(e) => setUserName(e.target.value)}
                      value={userName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Seu Portfólio (URL)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: joao.dev"
                      className="input-primary py-2"
                      onChange={(e) => setUserPortfolio(e.target.value)}
                      value={userPortfolio}
                    />
                  </div>
                </div>
                <button 
                  onClick={saveSettings}
                  className="btn-indigo w-full py-4 mt-4"
                >
                  Salvar Configurações
                </button>
                <a 
                  href="https://serper.dev/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-indigo-400 text-center block text-[10px] font-bold uppercase tracking-widest hover:text-indigo-300 transition-colors"
                >
                  Obter chave gratuita →
                </a>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
