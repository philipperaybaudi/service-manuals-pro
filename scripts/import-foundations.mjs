// Import "Foundations of Mechanical Accuracy" by Wayne R. Moore
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PDF_PATH = 'C:/Users/adm/Documents/SHEMATHEQUE/DOSSIER SOURCE/Catégorie/Usinage/Foundations of Mechanical Accuracy by Wayne R Moore - 1970.pdf';
const PREVIEW_PATH = 'scripts/temp_previews/foundations-mechanical-accuracy.jpg';

const title = 'Foundations of Mechanical Accuracy by Wayne R Moore \u2013 1970';
const slug = 'foundations-of-mechanical-accuracy-wayne-r-moore-1970';

const descriptionEn = `A landmark reference work published by Moore Special Tool Company exploring the fundamental principles of achieving extreme precision in manufacturing and metrology. The book is structured around four pillars of mechanical accuracy: Geometry (flat surfaces, straightedges, squareness), Length Standards (linear measurement, gauge blocks, international standards bureaus), Division of the Circle (angular measurement and precise circle division), and Roundness (spindle accuracy and hole geometry). Includes extensive coverage of universal measuring machine techniques, detailed analysis of cast iron properties (notably Meehanite) and the effects of temperature and humidity on dimensional stability. Features an introduction by Dr. George R. Harrison of MIT and traces the historical evolution of measuring instruments, jig borers, and ruling engines for diffraction gratings. 357 pages of detailed illustrations, diagrams and technical explanations for machinists, toolmakers, metrologists and precision engineers.`;

const descriptionFr = `Ouvrage de reference publie par Moore Special Tool Company explorant les principes fondamentaux permettant d'atteindre une precision extreme dans la fabrication et la metrologie. Le livre s'articule autour de quatre piliers de la precision mecanique : la Geometrie (surfaces planes, regles, equerrage), les Etalons de longueur (mesure lineaire, cales etalons, bureaux de normalisation internationaux), la Division du cercle (mesure angulaire et division precise) et la Circularite (precision des broches et geometrie des trous). Couvre en detail les techniques des machines a mesurer universelles, les proprietes de la fonte (notamment Meehanite) et l'impact de la temperature et de l'humidite sur la stabilite dimensionnelle. Inclut une introduction du Dr George R. Harrison du MIT et retrace l'evolution historique des instruments de mesure, des machines a aleser et des moteurs de division pour les reseaux de diffraction. 357 pages d'illustrations, schemas et explications techniques pour mecaniciens, outilleurs, metrologues et ingenieurs de precision.`;

(async () => {
  // 1. Get machining category
  const { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'machining')
    .single();
  if (!cat) { console.error('Category machining not found'); process.exit(1); }

  // 2. Get or create "Collection" brand in machining
  let { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('slug', 'collection-machining')
    .eq('category_id', cat.id)
    .single();

  if (!brand) {
    const { data: newBrand, error } = await supabase
      .from('brands')
      .insert({ name: 'Collection', slug: 'collection-machining', category_id: cat.id })
      .select('id')
      .single();
    if (error) { console.error('Error creating brand:', error); process.exit(1); }
    brand = newBrand;
    console.log('Created brand Collection in machining');
  }

  // 3. Upload PDF to R2
  const pdfBuf = readFileSync(PDF_PATH);
  const pdfKey = `documents/${slug}.pdf`;
  const { error: pdfErr } = await supabase.storage
    .from('documents')
    .upload(pdfKey, pdfBuf, { contentType: 'application/pdf', upsert: true });
  if (pdfErr) { console.error('PDF upload error:', pdfErr); process.exit(1); }
  console.log('PDF uploaded:', pdfKey);

  // 4. Upload preview to R2
  const prevBuf = readFileSync(PREVIEW_PATH);
  const prevKey = `previews/${slug}.jpg`;
  const { error: prevErr } = await supabase.storage
    .from('documents')
    .upload(prevKey, prevBuf, { contentType: 'image/jpeg', upsert: true });
  if (prevErr) { console.error('Preview upload error:', prevErr); process.exit(1); }

  const previewUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${prevKey}`;
  console.log('Preview uploaded:', previewUrl);

  // 5. Get PDF page count
  const pageCount = 357;

  // 6. Insert document
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({
      title,
      slug,
      description: descriptionEn,
      price: 2500, // $25 / 25 EUR
      file_path: pdfKey,
      preview_url: previewUrl,
      page_count: pageCount,
      file_size: pdfBuf.length,
      language: 'en',
      category_id: cat.id,
      brand_id: brand.id,
      active: true,
      featured: false,
    })
    .select('id, title, slug')
    .single();

  if (docErr) { console.error('Document insert error:', docErr); process.exit(1); }
  console.log('Document created:', doc);
  console.log('Done!');
})().catch(console.error);
