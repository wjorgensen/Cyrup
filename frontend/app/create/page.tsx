'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useChainId } from 'wagmi';
import { baseSepolia } from 'viem/chains';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useChallengeFactory } from '@/hooks/useChallengeFactory';
import { useChallengeEscrow } from '@/hooks/useChallengeEscrow';
import { useUSDC } from '@/hooks/useUSDC';
import { parseUnits } from 'viem';

export default function CreateChallenge() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { deployNewChallenge, isDeploying, isConfirmingDeploy, isDeploySuccess, deployedAddress, deployError } = useChallengeFactory();
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Algorithms');
  const [difficulty, setDifficulty] = useState('Medium');
  const [reward, setReward] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState(`## Challenge Description

Describe your proof challenge here...

### Requirements

1. Requirement 1
2. Requirement 2
3. Requirement 3

### Expected Output

Describe what the solution should provide...

### Resources

- [Resource 1](https://example.com)
- [Resource 2](https://example.com)

### Evaluation Criteria

- Correctness
- Clarity
- Efficiency`);
  const [previewMode, setPreviewMode] = useState(false);
  const [challengeAddress, setChallengeAddress] = useState<`0x${string}` | null>(null);
  const [approvalStep, setApprovalStep] = useState<'idle' | 'approving' | 'approved' | 'creating'>('idle');
  
  // Use the deployed challenge address to create the actual challenge
  const { createChallenge, isWriting, isConfirming, isSuccess } = useChallengeEscrow(challengeAddress || undefined);
  
  // USDC approval hook
  const { 
    approveUSDC, 
    checkAllowance, 
    balance,
    formatBalance,
    isWriting: isApprovingUSDC, 
    isConfirming: isConfirmingApproval, 
    isSuccess: isApprovalSuccess,
    resetWrite: resetApproval
  } = useUSDC();
  
  // Check current allowance for the challenge contract
  const { data: currentAllowance } = checkAllowance(challengeAddress || '0x0000000000000000000000000000000000000000' as `0x${string}`);
  
  // Watch for deployment errors
  useEffect(() => {
    if (deployError) {
      console.error('Deployment error:', deployError);
      // Check if it's a user rejection
      if (deployError.message?.includes('User rejected') || deployError.message?.includes('User denied')) {
        alert('Transaction was rejected. Please approve the transaction in your wallet.');
      } else {
        alert(`Error deploying challenge: ${deployError.message || 'Unknown error'}`);
      }
    }
  }, [deployError]);

  // Watch for successful deployment
  useEffect(() => {
    if (isDeploySuccess && deployedAddress) {
      setChallengeAddress(deployedAddress);
      setApprovalStep('approving');
    }
  }, [isDeploySuccess, deployedAddress]);
  
  // Handle USDC approval after deployment
  useEffect(() => {
    const handleApproval = async () => {
      if (challengeAddress && approvalStep === 'approving' && !isApprovingUSDC && !isConfirmingApproval && reward) {
        try {
          // Check if we need approval
          const rewardAmount = parseUnits(reward, 6);
          if (currentAllowance && currentAllowance >= rewardAmount) {
            // Already approved enough
            setApprovalStep('approved');
          } else {
            // Need to approve
            await approveUSDC(challengeAddress, reward);
          }
        } catch (error) {
          console.error('Error approving USDC:', error);
          alert('Failed to approve USDC. Please try again.');
          setApprovalStep('idle');
        }
      }
    };
    
    handleApproval();
  }, [challengeAddress, approvalStep, isApprovingUSDC, isConfirmingApproval, reward, currentAllowance, approveUSDC]);
  
  // Watch for successful approval
  useEffect(() => {
    if (isApprovalSuccess && approvalStep === 'approving') {
      setApprovalStep('approved');
    }
  }, [isApprovalSuccess, approvalStep]);
  
  // Create challenge after USDC approval
  useEffect(() => {
    const handleChallengeCreation = async () => {
      if (challengeAddress && approvalStep === 'approved' && !isWriting && !isConfirming && !isSuccess && title && deadline && description) {
        setApprovalStep('creating');
        const deadlineTimestamp = new Date(deadline).getTime() / 1000;
        const fullDescription = `# ${title}

**Category:** ${category}
**Difficulty:** ${difficulty}

${description}`;
        
        try {
          await createChallenge(reward, Math.floor(deadlineTimestamp), fullDescription);
        } catch (error) {
          console.error('Error creating challenge:', error);
          alert('Failed to create challenge. Please try again.');
          setApprovalStep('approved');
        }
      }
    };
    
    handleChallengeCreation();
  }, [challengeAddress, approvalStep, isWriting, isConfirming, isSuccess, createChallenge, title, category, difficulty, description, deadline, reward]);
  
  // Redirect after successful challenge creation
  useEffect(() => {
    if (isSuccess && challengeAddress) {
      router.push(`/challenge/${challengeAddress}`);
    }
  }, [isSuccess, challengeAddress, router]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    // Check if on the correct chain
    if (chainId !== baseSepolia.id) {
      alert(`Please switch to Base Sepolia network (chain ID: ${baseSepolia.id}). You are currently on chain ID: ${chainId}`);
      return;
    }
    
    if (!title || !reward || !deadline || !description) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Validate deadline is in the future
    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      alert('Deadline must be in the future');
      return;
    }
    
    // Validate reward amount
    const rewardAmount = parseFloat(reward);
    if (isNaN(rewardAmount) || rewardAmount <= 0) {
      alert('Please enter a valid reward amount');
      return;
    }
    
    // Check USDC balance
    if (balance !== undefined) {
      const rewardInWei = parseUnits(reward, 6);
      if (balance < rewardInWei) {
        alert(`Insufficient USDC balance. You have ${formatBalance(balance)} USDC but need ${reward} USDC.`);
        return;
      }
    }
    
    try {
      // Step 1: Deploy the challenge contract
      // Note: deployNewChallenge triggers the transaction but doesn't return a promise
      // The useEffect hooks will handle the rest once the transaction is confirmed
      deployNewChallenge();
      // Step 2: The useEffect hooks will handle approving USDC and creating the challenge
    } catch (error) {
      console.error('Error creating challenge:', error);
      alert('Failed to create challenge. Please try again.');
    }
  };
  
  const isProcessing = isDeploying || isConfirmingDeploy || isApprovingUSDC || isConfirmingApproval || isWriting || isConfirming;
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Create a Challenge</h1>
          
          {false && !isConnected && (
            <Card className="mb-6 bg-yellow-50 border-yellow-200">
              <p className="text-yellow-800">
                Please connect your wallet to create a challenge.
              </p>
            </Card>
          )}
          
          {isProcessing && (
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <p className="text-blue-800">
                {isDeploying && 'Deploying challenge contract...'}
                {isConfirmingDeploy && 'Confirming deployment...'}
                {(isApprovingUSDC || isConfirmingApproval) && 'Approving USDC spending...'}
                {isWriting && 'Creating challenge...'}
                {isConfirming && 'Confirming transaction...'}
              </p>
            </Card>
          )}
          
          <form onSubmit={handleSubmit}>
            <Card className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium mb-2">
                    Challenge Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-black/10 rounded-lg focus:outline-none focus:border-purple-500"
                    placeholder="e.g., Prove List Reversal Properties"
                    required
                    disabled={isProcessing}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium mb-2">
                      Category
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-black/10 rounded-lg focus:outline-none focus:border-purple-500"
                      disabled={isProcessing}
                    >
                      <option value="Algorithms">Algorithms</option>
                      <option value="Data Structures">Data Structures</option>
                      <option value="Cryptography">Cryptography</option>
                      <option value="Graph Theory">Graph Theory</option>
                      <option value="Number Theory">Number Theory</option>
                      <option value="Logic">Logic</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="difficulty" className="block text-sm font-medium mb-2">
                      Difficulty
                    </label>
                    <select
                      id="difficulty"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-4 py-2 border border-black/10 rounded-lg focus:outline-none focus:border-purple-500"
                      disabled={isProcessing}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reward" className="block text-sm font-medium mb-2">
                      Reward Amount (USDC)
                    </label>
                    <input
                      type="number"
                      id="reward"
                      value={reward}
                      onChange={(e) => setReward(e.target.value)}
                      className="w-full px-4 py-2 border border-black/10 rounded-lg focus:outline-none focus:border-purple-500"
                      placeholder="100"
                      step="0.01"
                      min="0"
                      required
                      disabled={isProcessing}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Rewards are paid in USDC on Base Sepolia
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="deadline" className="block text-sm font-medium mb-2">
                      Deadline
                    </label>
                    <input
                      type="datetime-local"
                      id="deadline"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full px-4 py-2 border border-black/10 rounded-lg focus:outline-none focus:border-purple-500"
                      required
                      disabled={isProcessing}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                </div>
              </div>
            </Card>
            
            <Card className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Challenge Description</h2>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={!previewMode ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setPreviewMode(false)}
                    disabled={isProcessing}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant={previewMode ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setPreviewMode(true)}
                    disabled={isProcessing}
                  >
                    Preview
                  </Button>
                </div>
              </div>
              
              {!previewMode ? (
                <div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-96 px-4 py-2 border border-black/10 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
                    placeholder="Use Markdown to format your challenge description..."
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Supports Markdown formatting. Use preview to see how it will look.
                  </p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({node, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '');
                        const { ref, ...restProps } = props as any;
                        return match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus as any}
                            language={match[1]}
                            PreTag="div"
                            {...restProps}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {description}
                  </ReactMarkdown>
                </div>
              )}
            </Card>
            
            <Card>
              <h2 className="text-xl font-semibold mb-4">Guidelines</h2>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">•</span>
                  Provide clear, unambiguous requirements for the proof
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">•</span>
                  Include relevant resources and documentation links
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">•</span>
                  Set a realistic deadline (minimum 7 days recommended)
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">•</span>
                  Ensure the reward reflects the complexity of the challenge
                </li>
                <li className="flex items-start">
                  <span className="text-purple-600 mr-2">•</span>
                  Be available to answer questions from potential solvers
                </li>
              </ul>
              
              {balance !== undefined && (
                <p className="text-sm text-gray-600 mb-4">
                  Your USDC Balance: <span className="font-medium">{formatBalance(balance)} USDC</span>
                </p>
              )}
              
              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg"
                  disabled={isProcessing}
                >
                  {isDeploying || isConfirmingDeploy ? 'Deploying Contract...' :
                   isApprovingUSDC || isConfirmingApproval ? 'Approving USDC...' :
                   isWriting || isConfirming ? 'Creating Challenge...' :
                   'Create Challenge'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="lg"
                  disabled={isProcessing}
                >
                  Save Draft
                </Button>
              </div>
            </Card>
          </form>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}