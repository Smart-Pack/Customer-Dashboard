#!/bin/bash

echo "VERCEL_ENV: $VERCEL_ENV"
echo "VERCEL_GIT_COMMIT_REF: $VERCEL_GIT_COMMIT_REF"

if [[ "$VERCEL_ENV" == "production" ]]; then
  # Always build production
  echo "✅ - Production build proceeding"
  exit 1

elif [[ "$VERCEL_ENV" == "preview" && "$VERCEL_GIT_COMMIT_REF" == "testing" ]]; then
  # Build only for preview environment with the 'testing' branch
  echo "✅ - Preview build for 'testing' branch proceeding"
  exit 1

else
  # Skip all other cases
  echo "🛑 - Build cancelled"
  exit 0
fi
