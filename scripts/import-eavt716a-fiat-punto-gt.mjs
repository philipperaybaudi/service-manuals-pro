/**
 * import-eavt716a-fiat-punto-gt.mjs
 *
 * Importe EAVT716A (Fiat Punto GT, AUTO-VOLT N°716)
 * sous la marque FIAT (catégorie automotive).
 * Source : C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Automobile\RENAULT\EAVT716A.pdf
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

const BUCKET   = 'service-manuals-documents';
const SLUG     = 'fiat-punto-gt-schema-fiche-auto-volt-716';
const PDF_SRC  = 'C:\\Users\\adm\\Documents\\SHEMATHEQUE\\DOCS EN LIGNE\\Automobile\\RENAULT\\EAVT716A.pdf';
const PDF_KEY  = `documents/${SLUG}.pdf`;

// 1. Vérifier que le slug n'existe pas déjà
const { data: existing } = await supabase.from('documents').select('id').eq('slug', SLUG).single();
if (existing) { console.error('✗ Slug déjà existant'); process.exit(1); }

// 2. Récupérer brand_id FIAT + category_id automotive
const { data: brand } = await supabase.from('brands').select('id').eq('slug', 'fiat').single();
if (!brand) { console.error('✗ Marque FIAT introuvable (slug: fiat)'); process.exit(1); }
const { data: category } = await supabase.from('categories').select('id').eq('slug', 'automotive').single();
if (!category) { console.error('✗ Catégorie automotive introuvable'); process.exit(1); }
console.log(`✓ brand_id FIAT      : ${brand.id}`);
console.log(`✓ category_id Auto   : ${category.id}`);

// 3. Lire et uploader le PDF
const pdfBuffer = fs.readFileSync(PDF_SRC);
const fileSizeBytes = pdfBuffer.length;
await r2.send(new PutObjectCommand({
  Bucket: BUCKET, Key: PDF_KEY, Body: pdfBuffer, ContentType: 'application/pdf',
}));
console.log(`✓ PDF uploadé : ${PDF_KEY} (${(fileSizeBytes / 1024 / 1024).toFixed(1)} MB)`);

// 4. Insérer dans Supabase
const { data: doc, error } = await supabase.from('documents').insert({
  slug:           SLUG,
  title:          'Fiat Punto GT — Technical Data Sheet AUTO-VOLT N°716',
  title_fr:       'Fiat Punto GT — Schéma-Fiche AUTO-VOLT N°716',
  description:    `Technical data sheet AUTO-VOLT N°716 dedicated to the Fiat Punto GT. The Punto GT is the high-performance turbocharged variant of the Fiat Punto range, fitted with a 1,372 cc single overhead camshaft 4-cylinder engine equipped with a Garrett turbocharger, producing 133 hp. This schéma-fiche covers the complete electrical architecture and technical specifications of the model: engine management system (Weber-Marelli injection and ignition), ignition circuit, fuel supply circuit, charging and starting circuits, lighting and signalling circuits, dashboard instruments and warning lights. Also covers the cooling system, lubrication, and braking system (standard front ventilated discs with rear drums). Includes wiring diagrams, connector locations, component specifications and adjustment values specific to the Punto GT variant.`,
  description_fr: `Schéma-Fiche AUTO-VOLT N°716 consacrée à la Fiat Punto GT. La Punto GT est la version haute performance turbocompressée de la gamme Fiat Punto, équipée d'un moteur 4 cylindres en ligne 1 372 cm³ simple arbre à cames en tête avec turbocompresseur Garrett, développant 133 ch. Ce schéma-fiche couvre l'architecture électrique complète et les caractéristiques techniques du modèle : système de gestion moteur (injection-allumage Weber-Marelli), circuit d'allumage, circuit d'alimentation en carburant, circuits de charge et de démarrage, circuits d'éclairage et de signalisation, instrumentation de bord et témoins lumineux. Couvre également le système de refroidissement, la lubrification, et le système de freinage (disques ventilés à l'avant, tambours à l'arrière en série). Inclut les schémas de câblage, la localisation des connecteurs, les valeurs de réglage et spécifications des composants propres à la variante Punto GT.`,
  brand_id:    brand.id,
  category_id: category.id,
  price:       1200,
  file_path:   PDF_KEY,
  file_size:   fileSizeBytes,
  page_count:  22,
  language:    'fr',
  active:      true,
  featured:    false,
  download_count: 0,
}).select().single();

if (error) { console.error('✗ Supabase insert :', error.message); process.exit(1); }
console.log(`✓ Document créé en base (id: ${doc.id})`);
console.log(`\n✅ Fiat Punto GT importé → /docs/${SLUG}`);
