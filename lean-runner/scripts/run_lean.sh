#!/bin/bash

# Script to run LEAN proof verification
# Input: LEAN code via stdin or file
# Output: JSON with verification result

# Don't exit on error - we want to capture and report errors
set +e

# Set timeout (default 30 seconds)
TIMEOUT=${TIMEOUT:-30}

# Create temporary file for the proof
PROOF_FILE="/proofs/temp_proof.lean"

# Read input (from stdin or file)
if [ -n "$1" ]; then
    cp "$1" "$PROOF_FILE"
else
    cat > "$PROOF_FILE"
fi

# Create a simple JSON response function
json_response() {
    local status="$1"
    local output="$2"
    local error="$3"
    
    # Escape special characters for JSON
    output=$(echo "$output" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
    error=$(echo "$error" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
    
    echo "{\"status\":\"$status\",\"output\":\"$output\",\"error\":\"$error\"}"
}

# Run LEAN with timeout and capture output
timeout "$TIMEOUT" lean "$PROOF_FILE" > /tmp/lean_output.txt 2>&1
exit_code=$?

# Read the output
output=$(cat /tmp/lean_output.txt)

# Handle different exit codes
if [ $exit_code -eq 124 ]; then
    # Timeout
    json_response "timeout" "" "Proof verification timed out after ${TIMEOUT} seconds"
elif [ $exit_code -eq 0 ]; then
    # Success - check if there are any error messages in output
    if echo "$output" | grep -qE "(error|Error|ERROR)" ; then
        json_response "error" "" "$output"
    elif [ -z "$output" ] || echo "$output" | grep -q "no errors" ; then
        json_response "success" "Proof verified successfully - no errors found" ""
    else
        # Success with some output (warnings, info, etc)
        json_response "success" "$output" ""
    fi
else
    # Non-zero exit code - verification failed
    if [ -z "$output" ]; then
        json_response "error" "" "Lean verification failed with exit code $exit_code"
    else
        json_response "error" "" "$output"
    fi
fi

# Clean up
rm -f "$PROOF_FILE" /tmp/lean_output.txt