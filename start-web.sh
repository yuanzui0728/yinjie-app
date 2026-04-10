#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

node scripts/dev-services.mjs restart api
node scripts/dev-services.mjs restart app
node scripts/dev-services.mjs restart admin
node scripts/dev-services.mjs status api
node scripts/dev-services.mjs status app
node scripts/dev-services.mjs status admin
