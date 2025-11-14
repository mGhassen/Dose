#!/bin/bash

# Test curl for object creation with media
# Using user.jpg from avatars

BACKEND_URL="${BACKEND_URL:-http://localhost:5001}"
TEST_FILE="apps/web/public/avatars/user.jpg"
LOCATION_ID=1

# You'll need to replace these with actual values
AUTH_TOKEN="${AUTH_TOKEN:-YOUR_TOKEN_HERE}"

if [ ! -f "$TEST_FILE" ]; then
  echo "Error: Test file not found: $TEST_FILE"
  exit 1
fi

echo "Testing object creation with media upload..."
echo "Backend: $BACKEND_URL"
echo "File: $TEST_FILE"
echo "Location ID: $LOCATION_ID"
echo ""

curl -v -X POST "${BACKEND_URL}/api/objects" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "Code=TEST-OBJ-$(date +%s)" \
  -F "Name=Test Object with Media" \
  -F "Description=Testing media upload" \
  -F "LocalisationIds[0]=${LOCATION_ID}" \
  -F "Medias[0].Comment=Test media file" \
  -F "Medias[0].File=@${TEST_FILE}"

echo ""
