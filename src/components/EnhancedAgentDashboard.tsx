import React, { useState, useEffect, useCallback } from 'react';
import { blink } from '../blink/client';
import { 
  GamepadIcon, 
  Copy, 
  Eye, 
  EyeOff, 
  Bell, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target,
  Calendar,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

interface Game {
  id: string;
  title: string;
  description: string;
  image_url: string;
  player_link: string;
  agent_link: string;
}

interface GameCredential {
  id: string;
  game_id: string;
  username: string;
  password: string;
  game_title?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  read_status: number;
  created_at: string;
  expires_at?: string;
  action_url?: string;
}

interface AgentPerformance {
  total_revenue: number;
  active_players: number;
  referrals: number;
  commission_earned: number;
}

interface GameAnalytics {
  game_id: string;
  game_title: string;
  revenue: number;
  players: number;
  sessions: number;
}

interface CommissionSetting {
  game_id: string | null;
  commission_rate: number;
  commission_type: string;
  game_title?: string;
}

export default function EnhancedAgentDashboard({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [assignedGames, setAssignedGames] = useState<Game[]>([]);
  const [credentials, setCredentials] = useState<GameCredential[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [performance, setPerformance] = useState<AgentPerformance>({
    total_revenue: 0,
    active_players: 0,
    referrals: 0,
    commission_earned: 0
  });
  const [gameAnalytics, setGameAnalytics] = useState<GameAnalytics[]>([]);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const [unreadCount, setUnreadCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load assigned games
      const assignedGamesData = await blink.db.agent_games.list({
        where: { agent_id: user.id }
      });
      
      const gameIds = assignedGamesData.map(ag => ag.game_id);
      const gamesData = await blink.db.games.list({
        where: { id: { in: gameIds } }
      });
      setAssignedGames(gamesData);

      // Load credentials for assigned games
      const credentialsData = await blink.db.game_credentials.list({
        where: { assigned_to: user.id }
      });
      const credentialsWithInfo = credentialsData.map(cred => ({
        ...cred,
        game_title: gamesData.find(g => g.id === cred.game_id)?.title || 'Unknown Game'
      }));
      setCredentials(credentialsWithInfo);

      // Load notifications
      const notificationsData = await blink.db.notifications.list({
        where: { 
          OR: [
            { recipient_id: user.id },
            { recipient_id: 'all_agents' }
          ]
        },
        orderBy: { created_at: 'desc' },
        limit: 50
      });
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => Number(n.read_status) === 0).length);

      // Load performance data
      const performanceData = await blink.db.agent_performance.list({
        where: { agent_id: user.id }
      });
      
      const performanceMap: AgentPerformance = {
        total_revenue: 0,
        active_players: 0,
        referrals: 0,
        commission_earned: 0
      };
      
      performanceData.forEach(item => {
        if (item.metric_type === 'total_revenue') performanceMap.total_revenue = item.metric_value;
        if (item.metric_type === 'active_players') performanceMap.active_players = item.metric_value;
        if (item.metric_type === 'referrals') performanceMap.referrals = item.metric_value;
        if (item.metric_type === 'commission_earned') performanceMap.commission_earned = item.metric_value;
      });
      setPerformance(performanceMap);

      // Load game analytics for assigned games
      const analyticsData = await blink.db.game_analytics.list({
        where: { 
          agent_id: user.id,
          date_recorded: '2024-01-20'
        }
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

      // Load commission settings
      const commissionsData = await blink.db.commission_settings.list({
        where: { agent_id: user.id }
      });
      const commissionsWithInfo = commissionsData.map(comm => ({
        ...comm,
        game_title: comm.game_id ? gamesData.find(g => g.id === comm.game_id)?.title || 'Unknown Game' : 'All Games'
      }));
      setCommissionSettings(commissionsWithInfo);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

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

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await blink.db.notifications.update(notificationId, {
        read_status: 1
      });
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read_status: 1 } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-900/20 border-red-700';
      case 'high': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
      case 'normal': return 'text-blue-400 bg-blue-900/20 border-blue-700';
      case 'low': return 'text-gray-400 bg-gray-900/20 border-gray-700';
      default: return 'text-blue-400 bg-blue-900/20 border-blue-700';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'agent_registration': return <Users className="h-5 w-5" />;
      case 'suspicious_activity': return <AlertCircle className="h-5 w-5" />;
      case 'payment_alert': return <DollarSign className="h-5 w-5" />;
      case 'system_maintenance': return <Clock className="h-5 w-5" />;
      case 'performance_milestone': return <Award className="h-5 w-5" />;
      case 'game_assignment': return <GamepadIcon className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-white">${performance.total_revenue.toLocaleString()}</p>
              <p className="text-green-400 text-sm mt-1">+12% this month</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Active Players</p>
              <p className="text-2xl font-bold text-white">{performance.active_players}</p>
              <p className="text-blue-400 text-sm mt-1">+5 new this week</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Referrals</p>
              <p className="text-2xl font-bold text-white">{performance.referrals}</p>
              <p className="text-purple-400 text-sm mt-1">2 pending approval</p>
            </div>
            <Target className="h-8 w-8 text-purple-400" />
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Commission Earned</p>
              <p className="text-2xl font-bold text-white">${performance.commission_earned.toLocaleString()}</p>
              <p className="text-yellow-400 text-sm mt-1">Next payout: Jan 31</p>
            </div>
            <TrendingUp className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="space-y-3">
          {notifications.slice(0, 5).map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${getPriorityColor(notification.priority)} ${
                Number(notification.read_status) === 0 ? 'bg-opacity-20' : 'bg-opacity-10'
              }`}
              onClick={() => Number(notification.read_status) === 0 && markNotificationAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                {getNotificationIcon(notification.type)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white">{notification.title}</h4>
                    <span className="text-xs text-slate-400">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm mt-1">{notification.message}</p>
                  {Number(notification.read_status) === 0 && (
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Performance */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Game Performance Today</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300">Game</th>
                <th className="text-left py-3 px-4 text-slate-300">Revenue</th>
                <th className="text-left py-3 px-4 text-slate-300">Players</th>
                <th className="text-left py-3 px-4 text-slate-300">Sessions</th>
                <th className="text-left py-3 px-4 text-slate-300">Commission</th>
              </tr>
            </thead>
            <tbody>
              {gameAnalytics.map((game) => {
                const commission = commissionSettings.find(c => c.game_id === game.game_id);
                const commissionAmount = commission 
                  ? (game.revenue * commission.commission_rate / 100)
                  : 0;
                
                return (
                  <tr key={game.game_id} className="border-b border-slate-700/50">
                    <td className="py-3 px-4 text-white">{game.game_title}</td>
                    <td className="py-3 px-4 text-green-400">${game.revenue.toLocaleString()}</td>
                    <td className="py-3 px-4 text-blue-400">{game.players}</td>
                    <td className="py-3 px-4 text-purple-400">{game.sessions}</td>
                    <td className="py-3 px-4 text-yellow-400">${commissionAmount.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAssignedGames = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Assigned Games</h2>
        <div className="text-slate-400">
          {assignedGames.length} games assigned
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignedGames.map((game) => {
          const analytics = gameAnalytics.find(a => a.game_id === game.id);
          const commission = commissionSettings.find(c => c.game_id === game.id);
          
          return (
            <div key={game.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <img 
                src={game.image_url} 
                alt={game.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{game.title}</h3>
                <p className="text-slate-400 text-sm mb-4">{game.description}</p>
                
                {/* Performance Stats */}
                {analytics && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-green-400 font-semibold">${analytics.revenue}</div>
                      <div className="text-slate-400 text-xs">Revenue</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-400 font-semibold">{analytics.players}</div>
                      <div className="text-slate-400 text-xs">Players</div>
                    </div>
                  </div>
                )}

                {/* Commission Rate */}
                {commission && (
                  <div className="bg-slate-700 rounded-lg p-3 mb-4">
                    <div className="text-yellow-400 font-semibold">
                      {commission.commission_rate}% Commission
                    </div>
                    <div className="text-slate-400 text-xs">
                      {commission.commission_type === 'percentage' ? 'Percentage based' : 'Fixed amount'}
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(game.player_link)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Player Link
                    </button>
                    <button
                      onClick={() => copyToClipboard(game.agent_link)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Agent Link
                    </button>
                  </div>
                  <button
                    onClick={() => window.open(game.agent_link, '_blank')}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Game
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderCredentials = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Game Credentials</h2>
        <div className="text-slate-400">
          {credentials.length} credentials available
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {credentials.map((credential) => (
          <div key={credential.id} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{credential.game_title}</h3>
              <GamepadIcon className="h-6 w-6 text-blue-400" />
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Username</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={credential.username}
                    readOnly
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                  <button
                    onClick={() => copyToClipboard(credential.username)}
                    className="text-blue-400 hover:text-blue-300 p-2"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-slate-400 text-sm mb-1">Password</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showPasswords[credential.id] ? 'text' : 'password'}
                    value={credential.password}
                    readOnly
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                  <button
                    onClick={() => togglePasswordVisibility(credential.id)}
                    className="text-slate-400 hover:text-slate-300 p-2"
                  >
                    {showPasswords[credential.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(credential.password)}
                    className="text-blue-400 hover:text-blue-300 p-2"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-slate-400 text-sm">
                Use these credentials to access the game management panel
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Notifications</h2>
        <div className="flex items-center gap-4">
          {unreadCount > 0 && (
            <span className="bg-red-600 text-white text-sm px-3 py-1 rounded-full">
              {unreadCount} unread
            </span>
          )}
          <button
            onClick={() => {
              notifications.forEach(n => {
                if (Number(n.read_status) === 0) {
                  markNotificationAsRead(n.id);
                }
              });
            }}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Mark all as read
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-slate-800 rounded-lg p-6 border ${
              Number(notification.read_status) === 0 
                ? 'border-blue-500 bg-blue-900/10' 
                : 'border-slate-700'
            }`}
            onClick={() => Number(notification.read_status) === 0 && markNotificationAsRead(notification.id)}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">{notification.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(notification.priority)}`}>
                      {notification.priority}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <p className="text-slate-300 mb-3">{notification.message}</p>
                
                {notification.action_url && (
                  <button
                    onClick={() => window.open(notification.action_url, '_blank')}
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Take Action
                  </button>
                )}
                
                {Number(notification.read_status) === 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span className="text-blue-400 text-sm">Unread</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
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
          <div>
            <h1 className="text-xl font-bold text-white">Agent Dashboard</h1>
            <p className="text-slate-400">Welcome back, {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-slate-400 text-sm">Referral Code</div>
              <div className="text-blue-400 font-mono">{user.referral_code}</div>
            </div>
            <button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Logout
            </button>
          </div>
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
              <TrendingUp className="h-5 w-5" />
              Overview
            </button>
            
            <button
              onClick={() => setActiveTab('games')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 ${
                activeTab === 'games' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <GamepadIcon className="h-5 w-5" />
              Assigned Games
            </button>
            
            <button
              onClick={() => setActiveTab('credentials')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 ${
                activeTab === 'credentials' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Eye className="h-5 w-5" />
              Credentials
            </button>
            
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 relative ${
                activeTab === 'notifications' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <span className="absolute right-3 top-2 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'games' && renderAssignedGames()}
          {activeTab === 'credentials' && renderCredentials()}
          {activeTab === 'notifications' && renderNotifications()}
        </main>
      </div>
    </div>
  );
}