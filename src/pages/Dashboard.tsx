import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Package, 
  Users, 
  Shield,
  TrendingUp,
  Clock,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/ui/StatCard';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Badge, getStatusVariant } from '@/components/ui/StatusBadge';

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  totalEvidence: number;
  totalSuspects: number;
  pendingLabReports: number;
}

interface RecentActivity {
  id: string;
  type: 'case' | 'evidence' | 'suspect' | 'lab_report';
  title: string;
  timestamp: string;
  status?: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    activeCases: 0,
    totalEvidence: 0,
    totalSuspects: 0,
    pendingLabReports: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [casesRes, activeCasesRes, evidenceRes, suspectsRes, labReportsRes, recentCasesRes] = await Promise.all([
        supabase.from('cases').select('id', { count: 'exact', head: true }),
        supabase.from('cases').select('id', { count: 'exact', head: true }).neq('status', 'closed'),
        supabase.from('evidence').select('id', { count: 'exact', head: true }),
        supabase.from('suspects').select('id', { count: 'exact', head: true }),
        supabase.from('lab_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('cases').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        totalCases: casesRes.count || 0,
        activeCases: activeCasesRes.count || 0,
        totalEvidence: evidenceRes.count || 0,
        totalSuspects: suspectsRes.count || 0,
        pendingLabReports: labReportsRes.count || 0,
      });

      if (recentCasesRes.data) {
        setRecentActivity(recentCasesRes.data.map(c => ({
          id: c.id,
          type: 'case',
          title: c.title,
          timestamp: c.created_at,
          status: c.status,
        })));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to the Forensic Data Management System</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Cases"
            value={stats.totalCases}
            icon={FileText}
            variant="primary"
          />
          <StatCard
            title="Active Cases"
            value={stats.activeCases}
            icon={Activity}
            variant="success"
          />
          <StatCard
            title="Total Evidence"
            value={stats.totalEvidence}
            icon={Package}
            variant="warning"
          />
          <StatCard
            title="Pending Lab Reports"
            value={stats.pendingLabReports}
            icon={Clock}
            variant="danger"
          />
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card-forensic p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Recent Cases</h2>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No recent cases</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.timestamp), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    {activity.status && (
                      <Badge variant={getStatusVariant(activity.status)}>
                        {activity.status.replace('_', ' ')}
                      </Badge>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Summary Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card-forensic p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">System Overview</h2>
              <Shield className="w-5 h-5 text-primary" />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Total Suspects</span>
                </div>
                <span className="text-lg font-bold text-primary">{stats.totalSuspects}</span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Evidence Items</span>
                </div>
                <span className="text-lg font-bold text-primary">{stats.totalEvidence}</span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Active Investigations</span>
                </div>
                <span className="text-lg font-bold text-primary">{stats.activeCases}</span>
              </div>
              
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Pending Analysis</span>
                </div>
                <span className="text-lg font-bold text-warning">{stats.pendingLabReports}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
