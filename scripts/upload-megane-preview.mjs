import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SLUG        = 'renault-megane-diesel-schema-fiche-1996';
const JPG         = `C:\\Users\\adm\\Desktop\\${SLUG}.jpg`;
const STORAGE_KEY = `previews/${SLUG}.jpg`;

const buf = fs.readFileSync(JPG);
const { error: upErr } = await supabase.storage.from('logos').upload(STORAGE_KEY, buf, { contentType: 'image/jpeg', upsert: true });
if (upErr) { console.error('✗ Upload :', upErr.message); process.exit(1); }

const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(STORAGE_KEY);
await supabase.from('documents').update({ preview_url: publicUrl }).eq('slug', SLUG);
console.log(`✓ Preview uploadée : ${publicUrl}`);
