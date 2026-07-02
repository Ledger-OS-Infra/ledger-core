#!/bin/sh
set -e

# ts-node reads tsconfig.json which uses "module": "Node16". That module mode
# requires explicit .js extensions in imports, but the knexfile and migration
# files use extensionless imports. Override to CommonJS just for this process
# so knex can resolve modules correctly. The compiled server (dist/index.js)
# is unaffected — it does not use ts-node.
TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"node"}' npm run migrate

exec node dist/index.js
