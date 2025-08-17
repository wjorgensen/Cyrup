// API service layer for backend communication
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cyrup-production.up.railway.app';

// Types
export interface VerifyProofRequest {
  code: string;
  timeout?: number;
}

export interface VerifyProofResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    success: boolean;
    output?: string;
    error?: string;
  };
}

export interface SubmissionRequest {
  uid: string;
  challenge_address: string;
  wallet_address: string;
  solution_code: string;
  solution_hash?: string;
}

export interface Submission {
  uid: string;
  challenge_address: string;
  wallet_address: string;
  solution_code: string;
  solution_hash?: string;
  status: string;
  created_at: string;
  updated_at: string;
  verification_result?: any;
}

export interface LeaderboardEntry {
  wallet_address: string;
  total_points: number;
  challenge_count: number;
  winner_count: number;
  verifier_count: number;
  last_updated: string;
}

export interface ReputationEvent {
  wallet_address: string;
  event_type: 'challenge_won' | 'verification_completed' | 'challenge_created';
  points_earned: number;
  challenge_address?: string;
  metadata?: any;
}

// API client class
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // LEAN Verification endpoints
  async verifyProof(request: VerifyProofRequest): Promise<VerifyProofResponse> {
    return this.request<VerifyProofResponse>('/api/verify', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getVerificationStatus(id: string): Promise<VerifyProofResponse> {
    return this.request<VerifyProofResponse>(`/api/status/${id}`);
  }

  async getVerificationResult(id: string): Promise<VerifyProofResponse> {
    return this.request<VerifyProofResponse>(`/api/result/${id}`);
  }

  // Submission endpoints
  async createSubmission(submission: SubmissionRequest): Promise<Submission> {
    return this.request<Submission>('/api/submissions', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  }

  async getSubmission(uid: string): Promise<Submission> {
    return this.request<Submission>(`/api/submissions/${uid}`);
  }

  async updateSubmissionStatus(uid: string, status: string): Promise<Submission> {
    return this.request<Submission>(`/api/submissions/${uid}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getUserSubmissions(walletAddress: string): Promise<Submission[]> {
    return this.request<Submission[]>(`/api/submissions/wallet/${walletAddress}`);
  }

  async getChallengeSubmissions(challengeAddress: string): Promise<Submission[]> {
    return this.request<Submission[]>(`/api/submissions/challenge/${challengeAddress}`);
  }

  // Leaderboard endpoints
  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    return this.request<LeaderboardEntry[]>(`/api/leaderboard?limit=${limit}`);
  }

  async getTopPerformers(limit: number = 10): Promise<LeaderboardEntry[]> {
    return this.request<LeaderboardEntry[]>(`/api/leaderboard/top?limit=${limit}`);
  }

  async getUserStats(walletAddress: string): Promise<LeaderboardEntry> {
    return this.request<LeaderboardEntry>(`/api/leaderboard/user/${walletAddress}`);
  }

  async recordReputationEvent(event: ReputationEvent): Promise<void> {
    return this.request<void>('/api/leaderboard/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async getRecentEvents(limit: number = 20): Promise<ReputationEvent[]> {
    return this.request<ReputationEvent[]>(`/api/leaderboard/events/recent?limit=${limit}`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export hooks for React components
export function useApiClient() {
  return apiClient;
}