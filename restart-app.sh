#!/bin/bash
cd "$(dirname "$0")"
node scripts/dev-services.mjs restart api
node scripts/dev-services.mjs restart app
