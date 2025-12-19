#!/bin/bash

# Script to fix SQUARE_REDIRECT_URI in .env files

CORRECT_URI="http://localhost:3000/api/integrations/oauth/square/callback"
WRONG_PATTERNS=("squareup.com/oauth2/authorize" "squareupsandbox.com/oauth2/authorize")

# Check root .env
if [ -f ".env" ]; then
  echo "Checking .env..."
  if grep -q "SQUARE_REDIRECT_URI" .env; then
    CURRENT=$(grep "SQUARE_REDIRECT_URI" .env | cut -d'=' -f2)
    IS_WRONG=false
    for pattern in "${WRONG_PATTERNS[@]}"; do
      if [[ "$CURRENT" == *"$pattern"* ]]; then
        IS_WRONG=true
        break
      fi
    done
    
    if [ "$IS_WRONG" = true ]; then
      echo "❌ Found wrong SQUARE_REDIRECT_URI in .env: $CURRENT"
      sed -i.bak "s|SQUARE_REDIRECT_URI=.*|SQUARE_REDIRECT_URI=$CORRECT_URI|" .env
      echo "✅ Fixed .env"
    else
      echo "✅ .env has correct SQUARE_REDIRECT_URI"
    fi
  fi
fi

# Check apps/web/.env.local
if [ -f "apps/web/.env.local" ]; then
  echo "Checking apps/web/.env.local..."
  if grep -q "SQUARE_REDIRECT_URI" apps/web/.env.local; then
    CURRENT=$(grep "SQUARE_REDIRECT_URI" apps/web/.env.local | cut -d'=' -f2)
    IS_WRONG=false
    for pattern in "${WRONG_PATTERNS[@]}"; do
      if [[ "$CURRENT" == *"$pattern"* ]]; then
        IS_WRONG=true
        break
      fi
    done
    
    if [ "$IS_WRONG" = true ]; then
      echo "❌ Found wrong SQUARE_REDIRECT_URI in apps/web/.env.local: $CURRENT"
      sed -i.bak "s|SQUARE_REDIRECT_URI=.*|SQUARE_REDIRECT_URI=$CORRECT_URI|" apps/web/.env.local
      echo "✅ Fixed apps/web/.env.local"
    else
      echo "✅ apps/web/.env.local has correct SQUARE_REDIRECT_URI"
    fi
  fi
fi

# Check apps/web/.env
if [ -f "apps/web/.env" ]; then
  echo "Checking apps/web/.env..."
  if grep -q "SQUARE_REDIRECT_URI" apps/web/.env; then
    CURRENT=$(grep "SQUARE_REDIRECT_URI" apps/web/.env | cut -d'=' -f2)
    IS_WRONG=false
    for pattern in "${WRONG_PATTERNS[@]}"; do
      if [[ "$CURRENT" == *"$pattern"* ]]; then
        IS_WRONG=true
        break
      fi
    done
    
    if [ "$IS_WRONG" = true ]; then
      echo "❌ Found wrong SQUARE_REDIRECT_URI in apps/web/.env: $CURRENT"
      sed -i.bak "s|SQUARE_REDIRECT_URI=.*|SQUARE_REDIRECT_URI=$CORRECT_URI|" apps/web/.env
      echo "✅ Fixed apps/web/.env"
    else
      echo "✅ apps/web/.env has correct SQUARE_REDIRECT_URI"
    fi
  fi
fi

echo ""
echo "✅ Done! Please restart your development server for changes to take effect."

