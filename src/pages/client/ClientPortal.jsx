import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LogOut, FileText, Upload, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import JobStatusCard from '@/components/client/JobStatusCard';
import EstimateSummaryCard from '@/components/client/EstimateSummaryCard';
import DocumentUploadPanel from '@/components/client/DocumentUploadPanel';

const STATUS_ICONS = {
  new: { icon: AlertCircle, color: 'text-blue-600' },
  in_progress: { icon: Clock, color: 'text-amber-600' },
  pending_approval: { icon: Clock, color: 'text-orange-600' },
  approved: { icon: CheckCircle, color: 'text-green-600' },
  closed: { icon: CheckCircle, color: 'text-slate-600' },
};

export default function ClientPortal() {
  const navigate = useNavigate();
  const [clientEmail, setClientEmail] = useState('');
  const [clientToken, setClientToken] = useState('');

  useEffect(() => {
    const email = localStorage.getItem('client_email');
    const token = localStorage.getItem('client_token');

    if (!email || !token) {
      navigate('/client-login');
      return;
    }

    setClientEmail(email);
    setClientToken(token);
  }, [navigate]);

  // Fetch jobs for this client
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['client-jobs', clientEmail],
    queryFn: () => base44.functions.invoke('getClientJobs', { client_email: clientEmail, token: clientToken }),
    enabled: !!clientEmail && !!clientToken,
    select: (res) => res.data?.jobs || [],
    retry: 1,
  });

  // Fetch estimates for each job
  const { data: estimates = {}, isLoading: estimatesLoading } = useQuery({
    queryKey: ['client-estimates', jobs.map((j) => j.id).join(',')],
    queryFn: () => base44.functions.invoke('getClientEstimates', { job_ids: jobs.map((j) => j.id), client_email: clientEmail, token: clientToken }),
    enabled: jobs.length > 0 && !!clientToken,
    select: (res) => res.data?.estimates || {},
    retry: 1,
  });

  const handleLogout = () => {
    localStorage.removeItem('client_email');
    localStorage.removeItem('client_token');
    navigate('/client-login');
  };

  if (jobsLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-10 w-40 bg-muted rounded-lg animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/40 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">My Jobs</h1>
            <p className="text-sm text-muted-foreground">{clientEmail}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <LogOut size={14} />
            Logout
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {jobs.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <FileText size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No jobs found for your account.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Jobs overview */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Job Status</h2>
              {jobs.map((job) => (
                <JobStatusCard
                  key={job.id}
                  job={job}
                  estimate={estimates[job.id]}
                />
              ))}
            </div>

            {/* Approved estimates */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Approved Estimates</h2>
              <div className="grid gap-3">
                {jobs
                  .filter((job) => estimates[job.id]?.status === 'approved')
                  .map((job) => (
                    <EstimateSummaryCard
                      key={job.id}
                      job={job}
                      estimate={estimates[job.id]}
                    />
                  ))}
              </div>
              {!jobs.some((job) => estimates[job.id]?.status === 'approved') && (
                <Card className="border-border bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">No approved estimates yet</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Document upload */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Upload Documents</h2>
              <DocumentUploadPanel
                jobIds={jobs.map((j) => j.id)}
                clientEmail={clientEmail}
                clientToken={clientToken}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}