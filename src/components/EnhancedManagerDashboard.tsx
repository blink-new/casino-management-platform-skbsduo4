import React, { useState, useEffect, useCallback } from 'react';
import { blink } from '../blink/client';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Settings, 
  Users, 
  GamepadIcon,
  BarChart3,
  Bell,
  Copy,
  Eye,
  EyeOff,
  TrendingUp,
  DollarSign,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react';

interface Game {
  id: string;
  title: string;
  description: string;
  image_url: string;
  player_link: string;
  agent_link: string;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  status: string;
  created_at: string;
}

interface GameCredential {
  id: string;
  game_id: string;
  username: string;
  password: string;
  assigned_to: string;
  game_title?: string;
  agent_name?: string;
}

interface GameSetting {
  id: string;
  game_id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description: string;
  game_title?: string;
}

interface CommissionSetting {
  id: string;
  agent_id: string;
  game_id: string | null;
  commission_rate: number;
  commission_type: string;
  agent_name?: string;
  game_title?: string;
}

interface GameAnalytics {
  game_id: string;
  game_title: string;
  revenue: number;
  players: number;
  sessions: number;
}

interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  total_revenue: number;
  active_players: number;
  referrals: number;
  commission_earned: number;
}

interface NotificationType {
  id: string;
  name: string;
  description: string;
  default_enabled: boolean;
}

export default function EnhancedManagerDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [games, setGames] = useState<Game[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [credentials, setCredentials] = useState<GameCredential[]>([]);
  const [gameSettings, setGameSettings] = useState<GameSetting[]>([]);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSetting[]>([]);
  const [gameAnalytics, setGameAnalytics] = useState<GameAnalytics[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});

  // Form states
  const [showGameForm, setShowGameForm] = useState(false);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [showSettingForm, setShowSettingForm] = useState(false);
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load games
      const gamesData = await blink.db.games.list();
      setGames(gamesData);

      // Load agents
      const agentsData = await blink.db.users.list({
        where: { role: 'agent' }
      });
      setAgents(agentsData);

      // Load credentials with game and agent info
      const credentialsData = await blink.db.game_credentials.list();
      const credentialsWithInfo = credentialsData.map(cred => ({
        ...cred,
        game_title: gamesData.find(g => g.id === cred.game_id)?.title || 'Unknown Game',
        agent_name: agentsData.find(a => a.id === cred.assigned_to)?.name || 'Unassigned'
      }));
      setCredentials(credentialsWithInfo);

      // Load game settings
      const settingsData = await blink.db.game_settings.list();
      const settingsWithInfo = settingsData.map(setting => ({
        ...setting,
        game_title: gamesData.find(g => g.id === setting.game_id)?.title || 'Unknown Game'
      }));
      setGameSettings(settingsWithInfo);

      // Load commission settings
      const commissionsData = await blink.db.commission_settings.list();
      const commissionsWithInfo = commissionsData.map(comm => ({
        ...comm,
        agent_name: agentsData.find(a => a.id === comm.agent_id)?.name || 'Unknown Agent',
        game_title: comm.game_id ? gamesData.find(g => g.id === comm.game_id)?.title || 'Unknown Game' : 'All Games'
      }));
      setCommissionSettings(commissionsWithInfo);

      // Load analytics
      const analyticsData = await blink.db.game_analytics.list({
        where: { date_recorded: '2024-01-20' }
      });
      
      const analyticsMap = new Map<string, GameAnalytics>();
      analyticsData.forEach(item => {
        const gameTitle = gamesData.find(g => g.id === item.game_id)?.title || 'Unknown Game';
        if (!analyticsMap.has(item.game_id)) {
          analyticsMap.set(item.game_id, {
            game_id: item.game_id,
            game_title: gameTitle,
            revenue: 0,
            players: 0,
            sessions: 0
          });
        }
        const analytics = analyticsMap.get(item.game_id)!;
        if (item.metric_type === 'revenue') analytics.revenue = item.metric_value;
        if (item.metric_type === 'players') analytics.players = item.metric_value;
        if (item.metric_type === 'sessions') analytics.sessions = item.metric_value;
      });
      setGameAnalytics(Array.from(analyticsMap.values()));

      // Load agent performance
      const performanceData = await blink.db.agent_performance.list();
      const performanceMap = new Map<string, AgentPerformance>();
      performanceData.forEach(item => {
        const agentName = agentsData.find(a => a.id === item.agent_id)?.name || 'Unknown Agent';
        if (!performanceMap.has(item.agent_id)) {
          performanceMap.set(item.agent_id, {
            agent_id: item.agent_id,
            agent_name: agentName,
            total_revenue: 0,
            active_players: 0,
            referrals: 0,
            commission_earned: 0
          });
        }
        const performance = performanceMap.get(item.agent_id)!;
        if (item.metric_type === 'total_revenue') performance.total_revenue = item.metric_value;
        if (item.metric_type === 'active_players') performance.active_players = item.metric_value;
        if (item.metric_type === 'referrals') performance.referrals = item.metric_value;
        if (item.metric_type === 'commission_earned') performance.commission_earned = item.metric_value;
      });
      setAgentPerformance(Array.from(performanceMap.values()));

      // Load notification types
      const notificationTypesData = await blink.db.notification_types.list();
      setNotificationTypes(notificationTypesData);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const togglePasswordVisibility = (credentialId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [credentialId]: !prev[credentialId]
    }));
  };

  const sendNotification = async (title: string, message: string, type: string = 'general', priority: string = 'normal') => {
    try {
      await blink.db.notifications.create({
        id: `notif_${Date.now()}`,
        recipient_id: 'all_agents',
        title,
        message,
        type,
        priority,
        read_status: 0,
        user_id: 'manager@casino.com'
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleCreateGame = async (gameData: any) => {
    try {
      const newGame = await blink.db.games.create({
        id: `game_${Date.now()}`,
        ...gameData,
        user_id: 'manager@casino.com'
      });
      setGames(prev => [...prev, newGame]);
      setShowGameForm(false);
      await sendNotification('New Game Added', `${gameData.title} has been added to the platform`, 'game_assignment');
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  const handleCreateAgent = async (agentData: any) => {
    try {
      const referralCode = `REF_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const newAgent = await blink.db.users.create({
        id: `agent_${Date.now()}`,
        ...agentData,
        role: 'agent',
        referral_code: referralCode,
        status: 'active',
        user_id: 'manager@casino.com'
      });
      setAgents(prev => [...prev, newAgent]);
      setShowAgentForm(false);
      await sendNotification('New Agent Registered', `${agentData.name} has joined the platform`, 'agent_registration');
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Games</p>
              <p className="text-2xl font-bold text-white">{games.length}</p>
            </div>
            <GamepadIcon className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Active Agents</p>
              <p className="text-2xl font-bold text-white">{agents.length}</p>
            </div>
            <Users className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-white">
                ${gameAnalytics.reduce((sum, game) => sum + game.revenue, 0).toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Active Players</p>
              <p className="text-2xl font-bold text-white">
                {gameAnalytics.reduce((sum, game) => sum + game.players, 0)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Game Analytics */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Game Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300">Game</th>
                <th className="text-left py-3 px-4 text-slate-300">Revenue</th>
                <th className="text-left py-3 px-4 text-slate-300">Players</th>
                <th className="text-left py-3 px-4 text-slate-300">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {gameAnalytics.map((game) => (
                <tr key={game.game_id} className="border-b border-slate-700/50">
                  <td className="py-3 px-4 text-white">{game.game_title}</td>
                  <td className="py-3 px-4 text-green-400">${game.revenue.toLocaleString()}</td>
                  <td className="py-3 px-4 text-blue-400">{game.players}</td>
                  <td className="py-3 px-4 text-purple-400">{game.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Performance */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Agent Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300">Agent</th>
                <th className="text-left py-3 px-4 text-slate-300">Revenue</th>
                <th className="text-left py-3 px-4 text-slate-300">Players</th>
                <th className="text-left py-3 px-4 text-slate-300">Referrals</th>
                <th className="text-left py-3 px-4 text-slate-300">Commission</th>
              </tr>
            </thead>
            <tbody>
              {agentPerformance.map((agent) => (
                <tr key={agent.agent_id} className="border-b border-slate-700/50">
                  <td className="py-3 px-4 text-white">{agent.agent_name}</td>
                  <td className="py-3 px-4 text-green-400">${agent.total_revenue.toLocaleString()}</td>
                  <td className="py-3 px-4 text-blue-400">{agent.active_players}</td>
                  <td className="py-3 px-4 text-purple-400">{agent.referrals}</td>
                  <td className="py-3 px-4 text-yellow-400">${agent.commission_earned.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderGameManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Game Management</h2>
        <button
          onClick={() => setShowGameForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Game
        </button>
      </div>

      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search games..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300">Game</th>
                <th className="text-left py-3 px-4 text-slate-300">Description</th>
                <th className="text-left py-3 px-4 text-slate-300">Player Link</th>
                <th className="text-left py-3 px-4 text-slate-300">Agent Link</th>
                <th className="text-left py-3 px-4 text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {games
                .filter(game => 
                  game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  game.description.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((game) => (
                <tr key={game.id} className="border-b border-slate-700/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={game.image_url} 
                        alt={game.title}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <span className="text-white font-medium">{game.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{game.description}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => copyToClipboard(game.player_link)}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => copyToClipboard(game.agent_link)}
                      className="text-green-400 hover:text-green-300 flex items-center gap-1"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingItem(game);
                          setShowGameForm(true);
                        }}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-400 hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCredentialManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Game Credentials</h2>
        <button
          onClick={() => setShowCredentialForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Credential
        </button>
      </div>

      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300">Game</th>
                <th className="text-left py-3 px-4 text-slate-300">Username</th>
                <th className="text-left py-3 px-4 text-slate-300">Password</th>
                <th className="text-left py-3 px-4 text-slate-300">Assigned To</th>
                <th className="text-left py-3 px-4 text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {credentials.map((credential) => (
                <tr key={credential.id} className="border-b border-slate-700/50">
                  <td className="py-3 px-4 text-white">{credential.game_title}</td>
                  <td className="py-3 px-4 text-slate-300">{credential.username}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300">
                        {showPasswords[credential.id] ? credential.password : '••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(credential.id)}
                        className="text-slate-400 hover:text-slate-300"
                      >
                        {showPasswords[credential.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(credential.password)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{credential.agent_name}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-400 hover:text-blue-300">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-400 hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAgentManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Agent Management</h2>
        <button
          onClick={() => setShowAgentForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add Agent
        </button>
      </div>

      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300">Agent</th>
                <th className="text-left py-3 px-4 text-slate-300">Email</th>
                <th className="text-left py-3 px-4 text-slate-300">Referral Code</th>
                <th className="text-left py-3 px-4 text-slate-300">Status</th>
                <th className="text-left py-3 px-4 text-slate-300">Commission</th>
                <th className="text-left py-3 px-4 text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const performance = agentPerformance.find(p => p.agent_id === agent.id);
                return (
                  <tr key={agent.id} className="border-b border-slate-700/50">
                    <td className="py-3 px-4 text-white font-medium">{agent.name}</td>
                    <td className="py-3 px-4 text-slate-300">{agent.email}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400 font-mono">{agent.referral_code}</span>
                        <button
                          onClick={() => copyToClipboard(agent.referral_code)}
                          className="text-slate-400 hover:text-slate-300"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        agent.status === 'active' 
                          ? 'bg-green-900 text-green-300' 
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {agent.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-yellow-400">
                      ${performance?.commission_earned?.toLocaleString() || '0'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button className="text-blue-400 hover:text-blue-300">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-green-400 hover:text-green-300">
                          <Settings className="h-4 w-4" />
                        </button>
                        <button className="text-red-400 hover:text-red-300">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderNotificationCenter = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Notification Center</h2>
        <button
          onClick={() => setShowNotificationForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Bell className="h-4 w-4" />
          Send Notification
        </button>
      </div>

      {/* Notification Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notificationTypes.map((type) => (
          <div key={type.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium">{type.name}</h3>
              <div className={`w-3 h-3 rounded-full ${type.default_enabled ? 'bg-green-400' : 'bg-red-400'}`} />
            </div>
            <p className="text-slate-400 text-sm">{type.description}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Notifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => sendNotification('System Maintenance', 'Scheduled maintenance tonight from 2-4 AM EST', 'system_maintenance', 'high')}
            className="bg-yellow-600 hover:bg-yellow-700 text-white p-4 rounded-lg flex items-center gap-3"
          >
            <Clock className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Maintenance Alert</div>
              <div className="text-sm opacity-90">Notify all agents</div>
            </div>
          </button>
          
          <button
            onClick={() => sendNotification('Performance Milestone', 'Congratulations on reaching your monthly targets!', 'performance_milestone', 'normal')}
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg flex items-center gap-3"
          >
            <Target className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Milestone Alert</div>
              <div className="text-sm opacity-90">Celebrate achievements</div>
            </div>
          </button>
          
          <button
            onClick={() => sendNotification('Security Alert', 'Suspicious activity detected. Please review your accounts.', 'suspicious_activity', 'urgent')}
            className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-lg flex items-center gap-3"
          >
            <AlertTriangle className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Security Alert</div>
              <div className="text-sm opacity-90">Urgent notification</div>
            </div>
          </button>
          
          <button
            onClick={() => sendNotification('Payment Update', 'Commission payments have been processed successfully.', 'payment_alert', 'normal')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex items-center gap-3"
          >
            <CheckCircle className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Payment Alert</div>
              <div className="text-sm opacity-90">Commission updates</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Casino Management Platform</h1>
          <button
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-slate-800 border-r border-slate-700 min-h-screen p-4">
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 ${
                activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              Overview
            </button>
            
            <button
              onClick={() => setActiveTab('games')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 ${
                activeTab === 'games' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <GamepadIcon className="h-5 w-5" />
              Game Management
            </button>
            
            <button
              onClick={() => setActiveTab('credentials')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 ${
                activeTab === 'credentials' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Settings className="h-5 w-5" />
              Credentials
            </button>
            
            <button
              onClick={() => setActiveTab('agents')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 ${
                activeTab === 'agents' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Users className="h-5 w-5" />
              Agent Management
            </button>
            
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 ${
                activeTab === 'notifications' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Bell className="h-5 w-5" />
              Notifications
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'games' && renderGameManagement()}
          {activeTab === 'credentials' && renderCredentialManagement()}
          {activeTab === 'agents' && renderAgentManagement()}
          {activeTab === 'notifications' && renderNotificationCenter()}
        </main>
      </div>
    </div>
  );
}