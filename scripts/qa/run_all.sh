#!/usr/bin/env bash
# scripts/qa/run_all.sh
#
# Unified portfolio QA harness runner.
# Executes all four QA gates:
#   1. Route & Content Regression Validator (validate.py)
#   2. Local Link & Anchor Integrity Checker (check_links.py)
#   3. WCAG 2.1 AA Accessibility Auditor (check_a11y.py)
#   4. Responsive Layout & Horizontal-Overflow Checker (check_responsive.py)
#
# Default behavior is baseline-aware: exits 0 if no new regressions are found.
# Use --strict to fail on any finding including pre-existing baseline issues.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

SITE_DIR="$REPO_ROOT"
PORT="${PORT:-8000}"
FAIL_FAST=0
STRICT=0
UPDATE_BASELINE=0

EXTRA_ARGS=()
for arg in "$@"; do
    case "$arg" in
        --fail-fast)
            FAIL_FAST=1
            ;;
        --strict)
            STRICT=1
            ;;
        --update-baseline)
            UPDATE_BASELINE=1
            ;;
        --site=*)
            SITE_DIR="${arg#*=}"
            ;;
        --port=*)
            PORT="${arg#*=}"
            ;;
        -*)
            EXTRA_ARGS+=("$arg")
            ;;
        *)
            if [[ -d "$arg" ]]; then
                SITE_DIR="$arg"
            fi
            ;;
    esac
done

# Convert SITE_DIR to absolute path
SITE_DIR="$(cd "$SITE_DIR" && pwd)"

echo "========================================================================"
echo "RUNNING FULL PORTFOLIO QA HARNESS"
echo "========================================================================"
echo "Target Site Directory : $SITE_DIR"
echo "Test Server Port      : $PORT"
echo "Mode                  : $([ $STRICT -eq 1 ] && echo 'STRICT (zero tolerance)' || echo 'BASELINE-AWARE (regression detection)')"
$([ $UPDATE_BASELINE -eq 1 ] && echo "Action                : UPDATE BASELINES")
echo "Timestamp             : $(date -u '+%Y-%m-%d %H:%M:%SZ')"
echo "========================================================================"
echo ""

EXIT_VALIDATE=0
EXIT_LINKS=0
EXIT_A11Y=0
EXIT_RESPONSIVE=0

# ----------------------------------------------------------------------
# GATE 1: Route & Content Regression Validation (validate.py)
# ----------------------------------------------------------------------
echo ">>> [1/4] Running Route & Content Regression Validator (validate.py)..."
python3 "$SCRIPT_DIR/validate.py" --site "$SITE_DIR"
EXIT_VALIDATE=$?
echo "Gate 1 Exit Code: $EXIT_VALIDATE"
echo ""

if [[ $FAIL_FAST -eq 1 && $EXIT_VALIDATE -ne 0 ]]; then
    echo "Fail-fast enabled: Aborting after Gate 1 failure."
    exit $EXIT_VALIDATE
fi

# ----------------------------------------------------------------------
# GATE 2: Link & Anchor Integrity (check_links.py)
# ----------------------------------------------------------------------
echo ">>> [2/4] Running Link & Anchor Integrity Checker (check_links.py)..."
LINKS_CMD=(python3 "$SCRIPT_DIR/check_links.py" --site "$SITE_DIR")
if [[ $STRICT -eq 1 ]]; then
    LINKS_CMD+=(--strict)
fi
if [[ $UPDATE_BASELINE -eq 1 ]]; then
    LINKS_CMD+=(--update-baseline)
fi
"${LINKS_CMD[@]}"
EXIT_LINKS=$?
echo "Gate 2 Exit Code: $EXIT_LINKS"
echo ""

if [[ $FAIL_FAST -eq 1 && $EXIT_LINKS -ne 0 ]]; then
    echo "Fail-fast enabled: Aborting after Gate 2 failure."
    exit $EXIT_LINKS
fi

# ----------------------------------------------------------------------
# GATE 3: WCAG 2.1 AA Accessibility Audit (check_a11y.py)
# ----------------------------------------------------------------------
echo ">>> [3/4] Running Accessibility Auditor (check_a11y.py)..."
A11Y_CMD=(python3 "$SCRIPT_DIR/check_a11y.py" --site "$SITE_DIR" --port "$PORT")
if [[ $STRICT -eq 1 ]]; then
    A11Y_CMD+=(--strict)
fi
if [[ $UPDATE_BASELINE -eq 1 ]]; then
    A11Y_CMD+=(--update-baseline)
fi
"${A11Y_CMD[@]}"
EXIT_A11Y=$?
echo "Gate 3 Exit Code: $EXIT_A11Y"
echo ""

if [[ $FAIL_FAST -eq 1 && $EXIT_A11Y -ne 0 ]]; then
    echo "Fail-fast enabled: Aborting after Gate 3 failure."
    exit $EXIT_A11Y
fi

# ----------------------------------------------------------------------
# GATE 4: Responsive Layout & Mobile Overflow (check_responsive.py)
# ----------------------------------------------------------------------
echo ">>> [4/4] Running Responsive & Mobile Overflow Checker (check_responsive.py)..."
python3 "$SCRIPT_DIR/check_responsive.py" --site "$SITE_DIR" --port "$PORT"
EXIT_RESPONSIVE=$?
echo "Gate 4 Exit Code: $EXIT_RESPONSIVE"
echo ""

# ----------------------------------------------------------------------
# Final QA Summary
# ----------------------------------------------------------------------
echo "========================================================================"
echo "QA SUITE SUMMARY"
echo "========================================================================"
printf "  Gate 1: Route & Content Retention (validate.py)       : %s\n" "$([ $EXIT_VALIDATE -eq 0 ] && echo 'PASS' || echo 'FAIL')"
printf "  Gate 2: Link & Anchor Integrity (check_links.py)      : %s\n" "$([ $EXIT_LINKS -eq 0 ] && echo 'PASS' || echo 'FAIL')"
printf "  Gate 3: WCAG 2.1 AA Accessibility (check_a11y.py)      : %s\n" "$([ $EXIT_A11Y -eq 0 ] && echo 'PASS' || echo 'FAIL')"
printf "  Gate 4: Responsive & Mobile Overflow (check_responsive.py): %s\n" "$([ $EXIT_RESPONSIVE -eq 0 ] && echo 'PASS' || echo 'FAIL')"
echo "========================================================================"

TOTAL_FAILURES=$(( (EXIT_VALIDATE != 0) + (EXIT_LINKS != 0) + (EXIT_A11Y != 0) + (EXIT_RESPONSIVE != 0) ))

if [[ $TOTAL_FAILURES -gt 0 ]]; then
    echo "OVERALL STATUS: FAILED ($TOTAL_FAILURES gate(s) reported regressions/failures)"
    exit 1
else
    echo "OVERALL STATUS: ALL GATES PASSED"
    exit 0
fi
