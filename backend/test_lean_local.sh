#!/bin/bash

echo "Testing LEAN execution locally (requires LEAN installed)"
echo "========================================================="

# Check if lean is installed
if ! command -v lean &> /dev/null; then
    echo "LEAN is not installed locally. Installing via elan..."
    curl -sSf https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh | sh -s -- -y --default-toolchain leanprover/lean4:stable
    export PATH="$HOME/.elan/bin:$PATH"
fi

echo "LEAN version:"
lean --version
echo ""

# Test 1: Simple valid proof
echo "Test 1: Simple valid proof"
echo 'theorem simple : 1 + 1 = 2 := by rfl' > /tmp/test1.lean
lean /tmp/test1.lean
RESULT=$?
if [ $RESULT -eq 0 ]; then
    echo "✅ Test 1 PASSED: Valid proof verified"
else
    echo "❌ Test 1 FAILED: Valid proof should have succeeded"
fi
echo ""

# Test 2: Invalid proof (should fail)
echo "Test 2: Invalid proof (should fail)"
echo 'theorem wrong : 1 + 1 = 3 := by rfl' > /tmp/test2.lean
lean /tmp/test2.lean 2>&1
RESULT=$?
if [ $RESULT -ne 0 ]; then
    echo "✅ Test 2 PASSED: Invalid proof correctly rejected"
else
    echo "❌ Test 2 FAILED: Invalid proof should have been rejected"
fi
echo ""

# Test 3: Complex proof
echo "Test 3: Complex proof"
cat > /tmp/test3.lean << 'EOF'
def double (n : Nat) : Nat := n + n

theorem double_eq : double 3 = 6 := by
  unfold double
  rfl
EOF
lean /tmp/test3.lean
RESULT=$?
if [ $RESULT -eq 0 ]; then
    echo "✅ Test 3 PASSED: Complex proof verified"
else
    echo "❌ Test 3 FAILED: Complex proof should have succeeded"
fi
echo ""

# Test 4: Syntax error
echo "Test 4: Syntax error (should fail)"
echo 'theorem syntax_error : this is not valid lean code' > /tmp/test4.lean
lean /tmp/test4.lean 2>&1
RESULT=$?
if [ $RESULT -ne 0 ]; then
    echo "✅ Test 4 PASSED: Syntax error correctly detected"
else
    echo "❌ Test 4 FAILED: Syntax error should have been detected"
fi
echo ""

# Clean up
rm -f /tmp/test*.lean

echo "========================================================="
echo "Local LEAN testing complete!"