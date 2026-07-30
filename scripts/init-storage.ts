/**
 * Script init — crée le bucket Supabase Storage `kadrilex-files`.
 *
 * Usage local (depuis la machine du user) :
 *   tsx scripts/init-storage.ts
 *
 * Usage sur le VPS (dans le container) :
 *   docker compose exec app node -e "require('./scripts/init-storage.js')"
 *
 * Idempotent : peut être rappelé sans risque.
 */

import { ensureBucket, KADRILEX_BUCKET } from "../lib/storage/supabase"

async function main() {
    console.log(`Création / vérif bucket "${KADRILEX_BUCKET}"...`)
    await ensureBucket(KADRILEX_BUCKET)
    console.log("✅ Bucket prêt.")
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
