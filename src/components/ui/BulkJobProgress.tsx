"use client";

import { BulkJob, whatsappApi } from "@/lib/api";
import { useEffect, useState } from "react";

interface BulkJobProgressProps {
  jobId: string;
  onJobComplete?: (job: BulkJob) => void;
}

export default function BulkJobProgress({ jobId, onJobComplete }: BulkJobProgressProps) {
  const [job, setJob] = useState<BulkJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [hasNotifiedCompletion, setHasNotifiedCompletion] = useState(false);

  const fetchJobStatus = async () => {
    try {
      const response = await whatsappApi.getBulkJob(jobId);
      if (response.success && response.data) {
        setJob(response.data);
        
        // Stop polling if job is completed or failed
        if (response.data.status === "completed" || response.data.status === "failed") {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          // Only notify completion once
          if (!hasNotifiedCompletion) {
            setHasNotifiedCompletion(true);
            onJobComplete?.(response.data);
          }
        }
      } else {
        setError(response.error || "Failed to fetch job status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch job status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobStatus();
    
    // Start polling every 2 seconds
    const interval = setInterval(fetchJobStatus, 2000);
    setPollingInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [jobId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-500";
      case "processing":
        return "text-blue-500";
      case "completed":
        return "text-green-500";
      case "failed":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return "⏳";
      case "processing":
        return "🔄";
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      default:
        return "❓";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-github-canvas-subtle rounded-lg border border-github-border-default p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 border-2 border-[#1f6feb] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-github-fg-default">Loading job status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-github-canvas-subtle rounded-lg border border-github-border-default p-6">
        <div className="flex items-center gap-2 text-[#da3633]">
          <span>❌</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="bg-github-canvas-subtle rounded-lg border border-github-border-default p-6">
        <div className="text-github-fg-muted">Job not found</div>
      </div>
    );
  }

  // Ensure job has the expected structure
  const progress = job.progress || { total: 0, sent: 0, failed: 0, pending: 0 };
  const results = job.results || [];
  
  const progressPercentage = progress.total > 0 
    ? Math.round((progress.sent + progress.failed) / progress.total * 100)
    : 0;

  return (
    <div className="bg-github-canvas-subtle rounded-lg border border-github-border-default p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">📊</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-github-fg-default">
              Bulk Message Job
            </h3>
            <p className="text-sm text-github-fg-muted">
              Job ID: <span className="font-mono text-[#1f6feb]">{job.id}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getStatusIcon(job.status)}</span>
          <span className={`font-medium ${getStatusColor(job.status)}`}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-github-fg-default">Progress</span>
          <span className="text-sm text-github-fg-muted">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-github-canvas-default rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-github-canvas-default rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-github-fg-default">{progress.total}</div>
          <div className="text-sm text-github-fg-muted">Total</div>
        </div>
        <div className="bg-github-canvas-default rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#238636]">{progress.sent}</div>
          <div className="text-sm text-github-fg-muted">Sent</div>
        </div>
        <div className="bg-github-canvas-default rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#da3633]">{progress.failed}</div>
          <div className="text-sm text-github-fg-muted">Failed</div>
        </div>
        <div className="bg-github-canvas-default rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#f0883e]">{progress.pending}</div>
          <div className="text-sm text-github-fg-muted">Pending</div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-github-canvas-default rounded-lg p-4">
          <div className="text-sm text-github-fg-muted mb-1">Created</div>
          <div className="text-sm text-github-fg-default">{formatDate(job.createdAt)}</div>
        </div>
        <div className="bg-github-canvas-default rounded-lg p-4">
          <div className="text-sm text-github-fg-muted mb-1">Last Updated</div>
          <div className="text-sm text-github-fg-default">{formatDate(job.updatedAt)}</div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-github-fg-default mb-3">
            Results ({results.length} total)
          </h4>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-github-canvas-default rounded-lg border border-github-border-muted"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-lg ${result.status === 'success' ? 'text-[#238636]' : 'text-[#da3633]'}`}>
                      {result.status === 'success' ? '✅' : '❌'}
                    </span>
                    <span className="font-mono text-sm text-github-fg-default">{result.number}</span>
                    {result.messageId && (
                      <span className="text-xs text-github-fg-muted font-mono">
                        ID: {result.messageId}
                      </span>
                    )}
                  </div>
                  {result.error && (
                    <span className="text-xs text-[#da3633] max-w-xs truncate" title={result.error}>
                      {result.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live indicator */}
      {(job.status === "pending" || job.status === "processing") && (
        <div className="mt-4 flex items-center gap-2 text-sm text-[#1f6feb]">
          <div className="w-2 h-2 bg-[#1f6feb] rounded-full animate-pulse"></div>
          <span>Live updates enabled</span>
        </div>
      )}
    </div>
  );
} 