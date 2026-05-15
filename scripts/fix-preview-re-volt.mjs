/**
 * Uploade la preview PNG manquante pour le doc RE-VOLT
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const PNG_PATH     = 'C:/Users/adm/Documents/SHEMATHEQUE/DOCS EN LIGNE/Bricolage & DIY/RE-VOLT/Régulateur solaire pour batterie 1224 V Notice $3.png';
const SLUG         = 're-volt-solar-regulator-12-24v-pwm-battery-charger-usb-manual';
const STORAGE_PATH = `previews/${SLUG}.png`;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ── Upload Supabase Storage ────────────────────────────────────────────────
const buffer = fs.readFileSync(PNG_PATH);
const { error: upErr } = await supabase.storage
  .from('logos')
  .upload(STORAGE_PATH, buffer, { contentType: 'image/png', upsert: true });

if (upErr) { console.error('❌ Upload :', upErr.message); process.exit(1); }

const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(STORAGE_PATH);
console.log(`✓ Uploadée : ${publicUrl}`);

// ── Mise à jour DB ─────────────────────────────────────────────────────────
const { error: updErr } = await supabase
  .from('documents')
  .update({ preview_url: publicUrl })
  .eq('slug', SLUG);

if (updErr) { console.error('❌ DB :', updErr.message); process.exit(1); }
console.log('✓ preview_url mis à jour en base');
