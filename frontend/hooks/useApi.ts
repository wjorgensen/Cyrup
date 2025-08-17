'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, VerifyProofRequest, SubmissionRequest, ReputationEvent } from '@/services/api';
import { useState, useEffect } from 'react';

// Verification hooks
export function useVerifyProof() {
  const [verificationId, setVerificationId] = useState<string | null>(null);
  
  const mutation = useMutation({
    mutationFn: (request: VerifyProofRequest) => apiClient.verifyProof(request),
    onSuccess: (data) => {
      setVerificationId(data.id);
    },
  });

  // Poll for verification status
  const statusQuery = useQuery({
    queryKey: ['verificationStatus', verificationId],
    queryFn: () => verificationId ? apiClient.getVerificationStatus(verificationId) : null,
    enabled: !!verificationId && mutation.isSuccess,
    refetchInterval: (data) => {
      if (!data) return false;
      return data.status === 'pending' || data.status === 'processing' ? 2000 : false;
    },
  });

  return {
    verify: mutation.mutate,
    isVerifying: mutation.isPending || statusQuery.data?.status === 'processing',
    verificationResult: statusQuery.data,
    error: mutation.error || statusQuery.error,
    reset: () => {
      setVerificationId(null);
      mutation.reset();
    },
  };
}

// Submission hooks
export function useSubmissions(walletAddress?: string) {
  return useQuery({
    queryKey: ['submissions', walletAddress],
    queryFn: () => walletAddress ? apiClient.getUserSubmissions(walletAddress) : [],
    enabled: !!walletAddress,
  });
}

export function useChallengeSubmissions(challengeAddress?: string) {
  return useQuery({
    queryKey: ['challengeSubmissions', challengeAddress],
    queryFn: () => challengeAddress ? apiClient.getChallengeSubmissions(challengeAddress) : [],
    enabled: !!challengeAddress,
  });
}

export function useCreateSubmission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (submission: SubmissionRequest) => apiClient.createSubmission(submission),
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['challengeSubmissions', data.challenge_address] });
    },
  });
}

export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: string }) =>
      apiClient.updateSubmissionStatus(uid, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['challengeSubmissions'] });
    },
  });
}

// Leaderboard hooks
export function useLeaderboard(limit = 100) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => apiClient.getLeaderboard(limit),
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

export function useTopPerformers(limit = 10) {
  return useQuery({
    queryKey: ['topPerformers', limit],
    queryFn: () => apiClient.getTopPerformers(limit),
    staleTime: 30000,
  });
}

export function useUserStats(walletAddress?: string) {
  return useQuery({
    queryKey: ['userStats', walletAddress],
    queryFn: () => walletAddress ? apiClient.getUserStats(walletAddress) : null,
    enabled: !!walletAddress,
    staleTime: 30000,
  });
}

export function useRecordReputationEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (event: ReputationEvent) => apiClient.recordReputationEvent(event),
    onSuccess: () => {
      // Invalidate leaderboard queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['topPerformers'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentEvents'] });
    },
  });
}

export function useRecentEvents(limit = 20) {
  return useQuery({
    queryKey: ['recentEvents', limit],
    queryFn: () => apiClient.getRecentEvents(limit),
    staleTime: 10000, // Refresh more frequently
  });
}

// Health check hook
export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.healthCheck(),
    staleTime: 60000, // Check health every minute
    retry: 1,
  });
}

// Combined hook for submission with verification
export function useSubmitSolutionWithVerification() {
  const [uid, setUid] = useState<string>('');
  const verifyProof = useVerifyProof();
  const createSubmission = useCreateSubmission();
  const updateStatus = useUpdateSubmissionStatus();

  const submitSolution = async (
    code: string,
    challengeAddress: string,
    walletAddress: string,
    solutionHash: string
  ) => {
    // Generate unique ID for this submission
    const submissionUid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setUid(submissionUid);

    try {
      // Step 1: Verify the proof
      verifyProof.verify({ code, timeout: 30000 });

      // Step 2: Create submission in database
      await createSubmission.mutateAsync({
        uid: submissionUid,
        challenge_address: challengeAddress,
        wallet_address: walletAddress,
        solution_code: code,
        solution_hash: solutionHash,
      });

      return submissionUid;
    } catch (error) {
      console.error('Error submitting solution:', error);
      throw error;
    }
  };

  // Update submission status based on verification result
  useEffect(() => {
    if (verifyProof.verificationResult?.status === 'completed' && uid) {
      const status = verifyProof.verificationResult.result?.success ? 'verified' : 'failed';
      updateStatus.mutate({ uid, status });
    }
  }, [verifyProof.verificationResult, uid, updateStatus]);

  return {
    submitSolution,
    isSubmitting: verifyProof.isVerifying || createSubmission.isPending,
    verificationResult: verifyProof.verificationResult,
    submissionUid: uid,
    error: verifyProof.error || createSubmission.error,
  };
}