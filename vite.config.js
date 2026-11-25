import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const isCatalyst = process.env.VITE_APP_MODE === 'catalyst'

// In Catalyst builds, alias countApiBolt to an empty stub so the Supabase
// client (@supabase/supabase-js) and its anon key are never resolved or
// bundled. The bolt module is dead code in Catalyst mode — Vite tree-shakes
// the stub — but the import must resolve to something.
const alias = isCatalyst
  ? [{ find: /.*\/countApiBolt$/, replacement: fileURLToPath(new URL('./src/apis/countApiStub.js', import.meta.url)) }]
  : []

export default defineConfig({
  plugins: [vue()],
  resolve: { alias },
})
