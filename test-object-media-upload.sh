#!/bin/bash

# Test curl command for object creation with media
# Usage: ./test-object-media-upload.sh <auth_token> <location_id> <file_path>

if [ $# -lt 3 ]; then
  echo "Usage: $0 <auth_token> <location_id> <file_path>"
  echo "Example: $0 'your-token-here' 1 ./test-image.jpg"
  exit 1
fi

AUTH_TOKEN="$1"
LOCATION_ID="$2"
FILE_PATH="$3"

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
  echo "Error: File not found: $FILE_PATH"
  exit 1
fi

BACKEND_URL="${BACKEND_URL:-http://localhost:5001}"
# Or if using Next.js proxy: BACKEND_URL="http://localhost:3000"

echo "Testing object creation with media..."
echo "Backend URL: $BACKEND_URL"
echo "Location ID: $LOCATION_ID"
echo "File: $FILE_PATH"
echo ""

curl -v -X POST "${BACKEND_URL}/api/objects" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -F "Code=TEST-OBJ-$(date +%s)" \
  -F "Name=Test Object with Media" \
  -F "Description=Testing media upload via curl" \
  -F "LocalisationIds[0]=${LOCATION_ID}" \
  -F "Medias[0].Comment=Test media file uploaded via curl" \
  -F "Medias[0].File=@${FILE_PATH}"

echo ""
echo "Done!"

