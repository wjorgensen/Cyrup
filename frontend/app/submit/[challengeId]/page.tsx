'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Editor from '@monaco-editor/react';
import Markdown from '@/components/Markdown';
import { useChallengeEscrow } from '@/hooks/useChallengeEscrow';
import { useSubmitSolutionWithVerification } from '@/hooks/useApi';
import { keccak256, toHex } from 'viem';

interface PageProps {
  params: {
    challengeId: string;
  };
}

const initialCode = `-- Lean 4 Proof
-- Your solution goes here

theorem example_theorem : 1 + 1 = 2 := by
  rfl

-- Test your proof
#eval "Solution is ready"
`;

export default function SubmitSolution({ params }: PageProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const challengeAddress = params.challengeId as `0x${string}`;
  
  const [code, setCode] = useState(initialCode);
  const [showChallenge, setShowChallenge] = useState(false);
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [challengeData, setChallengeData] = useState<any>(null);
  const [challengeId, setChallengeId] = useState<number>(0); // Internal challenge ID
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Contract hooks
  const { readChallenge, submitSolution, isWriting, isConfirming, isSuccess } = useChallengeEscrow(challengeAddress);
  
  // API hooks for verification
  const { submitSolution: submitWithVerification, isSubmitting, verificationResult, submissionUid } = useSubmitSolutionWithVerification();
  
  // Read challenge data from contract
  const { data: challengeInfo } = readChallenge(challengeId);
  
  useEffect(() => {
    if (challengeInfo) {
      const [creator, rewardAmount, deadline, status, verifier, description] = challengeInfo;
      setChallengeData({
        creator,
        rewardAmount,
        deadline: Number(deadline),
        status: Number(status),
        verifier,
        description,
      });
    }
  }, [challengeInfo]);
  
  // Load saved code from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`lean-code-${params.challengeId}`);
    if (saved) {
      setCode(saved);
      setSavedCode(saved);
    }
  }, [params.challengeId]);
  
  // Handle successful submission
  useEffect(() => {
    if (isSuccess) {
      alert('Solution submitted successfully!');
      router.push(`/challenge/${challengeAddress}`);
    }
  }, [isSuccess, challengeAddress, router]);
  
  // Handle verification completion
  useEffect(() => {
    if (verificationResult?.status === 'completed' && submissionUid && !isWriting && !isConfirming) {
      if (verificationResult.result?.success) {
        // Submit to smart contract with the UID
        const solutionHash = keccak256(toHex(code));
        submitSolution(challengeId, solutionHash, submissionUid)
          .catch(console.error);
      } else {
        alert('Proof verification failed. Please check your code and try again.');
        setIsVerifying(false);
      }
    }
  }, [verificationResult, submissionUid, isWriting, isConfirming, code, challengeId, submitSolution]);
  
  const handleSave = () => {
    localStorage.setItem(`lean-code-${params.challengeId}`, code);
    setSavedCode(code);
    alert('Code saved locally!');
  };
  
  const handleSubmit = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (!address) {
      alert('Wallet address not found');
      return;
    }
    
    if (!code || code.trim() === '' || code === initialCode) {
      alert('Please write your solution before submitting');
      return;
    }
    
    setIsVerifying(true);
    
    try {
      // Generate solution hash for on-chain storage
      const solutionHash = keccak256(toHex(code));
      
      // Submit to backend for verification and storage
      await submitWithVerification(
        code,
        challengeAddress,
        address,
        solutionHash
      );
    } catch (error) {
      console.error('Error submitting solution:', error);
      alert('Failed to submit solution. Please try again.');
      setIsVerifying(false);
    }
  };
  
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };
  
  const isProcessing = isVerifying || isSubmitting || isWriting || isConfirming;
  const hasUnsavedChanges = savedCode !== null && savedCode !== code;
  
  // Format deadline
  const formatDeadline = (timestamp: number) => {
    if (!timestamp) return 'No deadline';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  // Format reward
  const formatReward = (amount: bigint) => {
    if (!amount) return '0 USDC';
    return (Number(amount) / 1e6).toFixed(2) + ' USDC';
  };
  
  // Get status text
  const getStatusText = (status: number) => {
    const statuses = ['Open', 'Active', 'Pending Approval', 'Completed', 'Cancelled'];
    return statuses[status] || 'Unknown';
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold">Submit Solution</h1>
            <Button
              variant={showChallenge ? 'primary' : 'secondary'}
              onClick={() => setShowChallenge(!showChallenge)}
            >
              {showChallenge ? 'Hide' : 'Show'} Challenge
            </Button>
          </div>
          
          {!isConnected && (
            <Card className="mb-6 bg-yellow-50 border-yellow-200">
              <p className="text-yellow-800">
                Please connect your wallet to submit a solution.
              </p>
            </Card>
          )}
          
          {isProcessing && (
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <p className="text-blue-800">
                {isVerifying && 'Verifying your proof...'}
                {isSubmitting && 'Submitting to backend...'}
                {isWriting && 'Submitting to blockchain...'}
                {isConfirming && 'Confirming transaction...'}
              </p>
            </Card>
          )}
          
          {showChallenge && challengeData && (
            <Card className="mb-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Challenge Details</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Status:</span> {getStatusText(challengeData.status)}
                  </div>
                  <div>
                    <span className="font-medium">Reward:</span> {formatReward(challengeData.rewardAmount)}
                  </div>
                  <div>
                    <span className="font-medium">Deadline:</span> {formatDeadline(challengeData.deadline)}
                  </div>
                  <div>
                    <span className="font-medium">Creator:</span> {challengeData.creator.slice(0, 6)}...{challengeData.creator.slice(-4)}
                  </div>
                </div>
              </div>
              <div className="prose prose-sm max-w-none">
                <Markdown content={challengeData.description || 'No description available'} />
              </div>
            </Card>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Lean 4 Code Editor</h2>
                <div className="flex gap-2">
                  {hasUnsavedChanges && (
                    <span className="text-sm text-yellow-600">Unsaved changes</span>
                  )}
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleSave}
                    disabled={isProcessing}
                  >
                    Save Locally
                  </Button>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Editor
                  height="500px"
                  defaultLanguage="rust"
                  theme="vs-dark"
                  value={code}
                  onChange={handleEditorChange}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    automaticLayout: true,
                    readOnly: isProcessing,
                  }}
                />
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <p>• Use Lean 4 syntax for your proof</p>
                  <p>• Your proof will be automatically verified</p>
                  <p>• Ensure all theorems are properly proved (no `sorry`)</p>
                </div>
                
                <div className="flex gap-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => router.push(`/challenge/${challengeAddress}`)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleSubmit}
                    disabled={!isConnected || isProcessing || challengeData?.status !== 0}
                  >
                    {isProcessing ? 'Processing...' : 'Submit Solution'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
          
          {verificationResult && (
            <Card className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Verification Result</h3>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Status:</span>{' '}
                  <span className={verificationResult.result?.success ? 'text-green-600' : 'text-red-600'}>
                    {verificationResult.result?.success ? 'Success' : 'Failed'}
                  </span>
                </p>
                {verificationResult.result?.output && (
                  <div>
                    <p className="font-medium">Output:</p>
                    <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                      {verificationResult.result.output}
                    </pre>
                  </div>
                )}
                {verificationResult.result?.error && (
                  <div>
                    <p className="font-medium text-red-600">Error:</p>
                    <pre className="bg-red-50 p-2 rounded text-sm text-red-800 overflow-x-auto">
                      {verificationResult.result.error}
                    </pre>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}