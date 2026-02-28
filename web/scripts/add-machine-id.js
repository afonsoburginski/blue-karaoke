const postgres = require('postgres')
const client = postgres('postgresql://postgres.tutatgjpyzhfviabepln:GHynNamVH8U3@aws-0-us-west-2.pooler.supabase.com:5432/postgres', { max: 1 })

async function run() {
  await client.unsafe(`
    ALTER TABLE chaves_ativacao ADD COLUMN IF NOT EXISTS machine_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_chaves_machine_id ON chaves_ativacao (machine_id);
  `)
  console.log('Migration OK: machine_id adicionado')
  await client.end()
}

run().catch(e => { console.error(e.message); process.exit(1) })
