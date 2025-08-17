import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AnimatedProofs } from '@/components/AnimatedProofs';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <section className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative">
          <AnimatedProofs />
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <h1 className="text-5xl md:text-7xl font-black uppercase mb-6 tracking-tight">
              The Marketplace for
              <span className="text-purple-700 block mt-2"> Lean Proofs</span>
            </h1>
            <p className="text-lg font-mono mb-12 max-w-2xl mx-auto">
              Connect proof seekers with verification experts. Post challenges, submit solutions, earn rewards.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button variant="primary" size="lg">
                <Link href="/dashboard">Browse Challenges</Link>
              </Button>
              <Button variant="secondary" size="lg">
                <Link href="/create">Create Challenge</Link>
              </Button>
            </div>
          </div>
        </section>
        
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-black uppercase text-center mb-16">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-white">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-700 text-white flex items-center justify-center mx-auto mb-6 shadow-box-sm">
                    <span className="font-black text-2xl">1</span>
                  </div>
                  <h3 className="font-black text-xl mb-3 uppercase">Post a Challenge</h3>
                  <p className="font-mono text-sm">
                    Describe the proof you need, set a reward amount, and publish your challenge to the marketplace.
                  </p>
                </div>
              </Card>
              
              <Card className="bg-white">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-700 text-white flex items-center justify-center mx-auto mb-6 shadow-box-sm">
                    <span className="font-black text-2xl">2</span>
                  </div>
                  <h3 className="font-black text-xl mb-3 uppercase">Submit Solutions</h3>
                  <p className="font-mono text-sm">
                    Expert verifiers write and submit Lean proofs using our integrated development environment.
                  </p>
                </div>
              </Card>
              
              <Card className="bg-white">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-700 text-white flex items-center justify-center mx-auto mb-6 shadow-box-sm">
                    <span className="font-black text-2xl">3</span>
                  </div>
                  <h3 className="font-black text-xl mb-3 uppercase">Earn Rewards</h3>
                  <p className="font-mono text-sm">
                    Valid proofs are verified on-chain and rewards are automatically distributed to successful solvers.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>
        
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-black uppercase text-center mb-16">Why Cyrup?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 bg-white shadow-box hover-lift">
                <h3 className="font-black text-xl mb-3 uppercase">Rigorous Verification</h3>
                <p className="font-mono text-sm">
                  All proofs are formally verified using the Lean theorem prover, ensuring mathematical correctness.
                </p>
              </div>
              
              <div className="p-6 bg-white shadow-box hover-lift">
                <h3 className="font-black text-xl mb-3 uppercase">Transparent Rewards</h3>
                <p className="font-mono text-sm">
                  Smart contracts handle reward distribution automatically, ensuring fair and timely payment.
                </p>
              </div>
              
              <div className="p-6 bg-white shadow-box hover-lift">
                <h3 className="font-black text-xl mb-3 uppercase">Expert Community</h3>
                <p className="font-mono text-sm">
                  Join a growing community of formal verification experts and enthusiasts from around the world.
                </p>
              </div>
              
              <div className="p-6 bg-white shadow-box hover-lift">
                <h3 className="font-black text-xl mb-3 uppercase">Integrated IDE</h3>
                <p className="font-mono text-sm">
                  Write and test your Lean proofs directly in the browser with our powerful development environment.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-purple-700">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-black uppercase mb-6 text-white">Ready to Get Started?</h2>
            <p className="text-lg font-mono mb-12 text-white">
              Join the future of formal verification.
            </p>
            <Button variant="secondary" size="lg">
              <Link href="/signup">Create Your Account</Link>
            </Button>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}