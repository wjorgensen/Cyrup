'use client';

import { useEffect, useRef } from 'react';

const proofSnippets = [
  'theorem add_comm : ∀ a b : ℕ, a + b = b + a',
  'lemma zero_add (n : ℕ) : 0 + n = n',
  '∀ x y : ℝ, x ≤ y → y ≤ x → x = y',
  'theorem sqrt_two_irrational : ¬∃ a b : ℕ, (a / b)² = 2',
  'def fibonacci : ℕ → ℕ\n| 0 => 0\n| 1 => 1\n| n+2 => fibonacci n + fibonacci (n+1)',
  'theorem fermat_little : ∀ p a : ℕ, Prime p → ¬(p ∣ a) → a^(p-1) ≡ 1 [MOD p]',
  'axiom choice : ∀ {α : Sort u} (P : α → Prop), (∀ x, P x) → P (Classical.choice P)',
  'theorem cantor_diag : ∀ f : ℕ → (ℕ → Bool), ∃ g : ℕ → Bool, ∀ n, f n ≠ g',
  'lemma succ_ne_zero : ∀ n : ℕ, n.succ ≠ 0',
  'theorem godel_incompleteness : ∀ T : Theory, Consistent T → ∃ φ, ¬(T ⊢ φ) ∧ ¬(T ⊢ ¬φ)',
  'inductive Nat : Type\n| zero : Nat\n| succ : Nat → Nat',
  'theorem euclid_infinite_primes : ∀ n : ℕ, ∃ p, p > n ∧ Prime p',
  'def gcd : ℕ → ℕ → ℕ\n| 0, n => n\n| m+1, n => gcd (n % (m+1)) (m+1)',
  'theorem pythagorean : ∀ a b c : ℝ, a² + b² = c² ↔ RightTriangle a b c',
  'axiom extensionality : ∀ {α β} (f g : α → β), (∀ x, f x = g x) → f = g',
  'theorem demorgan : ∀ p q : Prop, ¬(p ∨ q) ↔ ¬p ∧ ¬q',
  'lemma nat_ind : ∀ P : ℕ → Prop, P 0 → (∀ n, P n → P n.succ) → ∀ n, P n',
  'theorem russell_paradox : ¬∃ S : Set (Set α), ∀ x, x ∈ S ↔ x ∉ x',
  'def derivative (f : ℝ → ℝ) (x : ℝ) := lim h→0, (f(x+h) - f(x))/h',
  'theorem fundamental_arithmetic : ∀ n > 1, ∃! factorization : List Prime',
  'lemma cauchy_schwarz : |⟨x, y⟩| ≤ ‖x‖ * ‖y‖',
  'theorem banach_fixed_point : Complete X → Contraction f → ∃! x, f x = x',
  'axiom excluded_middle : ∀ p : Prop, p ∨ ¬p',
  'def limit (s : ℕ → ℝ) (l : ℝ) := ∀ ε > 0, ∃ N, ∀ n ≥ N, |s n - l| < ε',
  'theorem compactness : Compact X ↔ ∀ C : OpenCover X, ∃ F : FiniteSubcover C',
  'lemma pidgeonhole : ∀ n m : ℕ, n > m → ¬Injective (Fin n → Fin m)',
  'theorem chain_rule : ∀ f g, differentiable f → differentiable g → (f ∘ g)\' = f\' ∘ g * g\'',
  'def isPrime (n : ℕ) := n > 1 ∧ ∀ m, m ∣ n → m = 1 ∨ m = n',
  'theorem bezout : ∀ a b : ℤ, ∃ x y, a*x + b*y = gcd a b',
  'axiom countable_choice : ∀ {α} (P : ℕ → α → Prop), (∀ n, ∃ x, P n x) → ∃ f, ∀ n, P n (f n)',
];

interface ProofElement {
  id: number;
  text: string;
  x: number;
  y: number;
  opacity: number;
  speed: number;
  fontSize: number;
}

export function AnimatedProofs() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const proofsRef = useRef<ProofElement[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const initProofs = () => {
      const proofs: ProofElement[] = [];
      for (let i = 0; i < 20; i++) {
        proofs.push({
          id: i,
          text: proofSnippets[Math.floor(Math.random() * proofSnippets.length)],
          x: Math.random() * 95 + 2.5,
          y: Math.random() * 110 - 10,
          opacity: Math.random() * 0.2 + 0.1,
          speed: Math.random() * 0.15 + 0.1,
          fontSize: Math.random() * 6 + 12,
        });
      }
      proofsRef.current = proofs;
    };

    const animate = () => {
      if (!canvasRef.current) return;
      
      const container = canvasRef.current;
      container.innerHTML = '';
      
      proofsRef.current.forEach((proof) => {
        proof.y -= proof.speed;
        
        if (proof.y < -15) {
          proof.y = 115;
          proof.x = Math.random() * 95 + 2.5;
          proof.text = proofSnippets[Math.floor(Math.random() * proofSnippets.length)];
          proof.opacity = Math.random() * 0.2 + 0.1;
          proof.fontSize = Math.random() * 6 + 12;
        }
        
        const div = document.createElement('div');
        div.className = 'absolute whitespace-pre font-mono text-purple-700 transition-none';
        div.style.left = `${proof.x}%`;
        div.style.top = `${proof.y}%`;
        div.style.opacity = proof.opacity.toString();
        div.style.fontSize = `${proof.fontSize}px`;
        div.style.transform = 'translateX(-50%)';
        div.style.pointerEvents = 'none';
        div.style.willChange = 'transform';
        div.textContent = proof.text;
        
        container.appendChild(div);
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    initProofs();
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={canvasRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: -1 }}
    />
  );
}