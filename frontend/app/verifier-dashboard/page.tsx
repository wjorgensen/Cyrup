'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useVerifierMode } from '@/hooks/useVerifierMode';

interface Submission {
  id: string;
  challengeId: string;
  challengeTitle: string;
  submittedBy: string;
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  solutionHash: string;
}

export default function VerifierDashboard() {
  const isVerifierMode = useVerifierMode();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');

  useEffect(() => {
    // Demo data for verifier view
    if (isVerifierMode) {
      setSubmissions([
        {
          id: '1',
          challengeId: 'ch1',
          challengeTitle: 'Prime Number Theorem',
          submittedBy: '0x742d...8B3d',
          submittedAt: new Date('2024-01-15T10:30:00'),
          status: 'pending',
          solutionHash: '0xabc123...'
        },
        {
          id: '2',
          challengeId: 'ch2',
          challengeTitle: 'Fermat\'s Little Theorem',
          submittedBy: '0x9A5c...F2e1',
          submittedAt: new Date('2024-01-14T14:20:00'),
          status: 'pending',
          solutionHash: '0xdef456...'
        },
        {
          id: '3',
          challengeId: 'ch3',
          challengeTitle: 'Pythagorean Theorem',
          submittedBy: '0x1B3d...7C9a',
          submittedAt: new Date('2024-01-13T09:15:00'),
          status: 'approved',
          solutionHash: '0xghi789...'
        },
        {
          id: '4',
          challengeId: 'ch4',
          challengeTitle: 'Euclidean Algorithm',
          submittedBy: '0x4E6f...2D8c',
          submittedAt: new Date('2024-01-12T16:45:00'),
          status: 'rejected',
          solutionHash: '0xjkl012...'
        },
        {
          id: '5',
          challengeId: 'ch5',
          challengeTitle: 'Binomial Theorem',
          submittedBy: '0x8F2a...9E1b',
          submittedAt: new Date('2024-01-16T11:00:00'),
          status: 'pending',
          solutionHash: '0xmno345...'
        }
      ]);
    }
  }, [isVerifierMode]);

  const filteredSubmissions = submissions.filter(sub => {
    if (filter === 'pending') return sub.status === 'pending';
    if (filter === 'reviewed') return sub.status !== 'pending';
    return true;
  });

  const handleApprove = (submissionId: string) => {
    setSubmissions(prev => 
      prev.map(sub => 
        sub.id === submissionId ? { ...sub, status: 'approved' as const } : sub
      )
    );
  };

  const handleReject = (submissionId: string) => {
    setSubmissions(prev => 
      prev.map(sub => 
        sub.id === submissionId ? { ...sub, status: 'rejected' as const } : sub
      )
    );
  };

  if (!isVerifierMode) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl font-black uppercase mb-6">Access Denied</h1>
            <p className="font-mono mb-8">This page is only accessible to verifiers.</p>
            <Button variant="primary">
              <Link href="/dashboard">Go to Challenges</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-black uppercase mb-4">Verifier Dashboard</h1>
            <p className="font-mono text-gray-700">
              Review and verify submitted solutions for your challenges
            </p>
          </div>

          <div className="mb-6 flex gap-4">
            <Button 
              variant={filter === 'pending' ? 'primary' : 'secondary'}
              onClick={() => setFilter('pending')}
            >
              Pending ({submissions.filter(s => s.status === 'pending').length})
            </Button>
            <Button 
              variant={filter === 'reviewed' ? 'primary' : 'secondary'}
              onClick={() => setFilter('reviewed')}
            >
              Reviewed ({submissions.filter(s => s.status !== 'pending').length})
            </Button>
            <Button 
              variant={filter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setFilter('all')}
            >
              All ({submissions.length})
            </Button>
          </div>

          <div className="grid gap-6">
            {filteredSubmissions.length === 0 ? (
              <Card className="text-center py-12">
                <p className="font-mono text-gray-700">No submissions to review</p>
              </Card>
            ) : (
              filteredSubmissions.map((submission) => (
                <Card key={submission.id} className="bg-white">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-black text-xl mb-2">{submission.challengeTitle}</h3>
                      <div className="font-mono text-sm space-y-1">
                        <p>Submitted by: <span className="text-purple-700">{submission.submittedBy}</span></p>
                        <p>Submitted: {submission.submittedAt.toLocaleDateString()}</p>
                        <p>Solution Hash: {submission.solutionHash}</p>
                        {submission.status !== 'pending' && (
                          <p className={`font-bold ${
                            submission.status === 'approved' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            Status: {submission.status.toUpperCase()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link href={`/challenge/${submission.challengeId}/review/${submission.id}?verifier`}>
                        <Button variant="secondary" size="sm">
                          View Solution
                        </Button>
                      </Link>
                      {submission.status === 'pending' && (
                        <>
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => handleApprove(submission.id)}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleReject(submission.id)}
                            className="bg-red-600 text-white hover:bg-red-700"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}