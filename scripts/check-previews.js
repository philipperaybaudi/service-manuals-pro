const {createClient}=require('@supabase/supabase-js');
const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
(async()=>{
  const {data}=await s.from('documents').select('id,title,preview_url,slug,brand:brands(name)').eq('active',true).not('preview_url','is',null);
  const urlCounts = {};
  data.forEach(d => {
    const url = d.preview_url;
    if(!urlCounts[url]) urlCounts[url] = [];
    urlCounts[url].push(d.title);
  });
  const uniqueUrls = Object.keys(urlCounts).length;
  console.log('Total with preview:', data.length);
  console.log('Unique preview URLs:', uniqueUrls);
  console.log('');

  // Show URLs used by multiple docs
  const dupes = Object.entries(urlCounts)
    .filter(([_,titles]) => titles.length > 1)
    .sort((a,b) => b[1].length - a[1].length);

  console.log('Duplicate images (' + dupes.length + ' URLs shared):');
  dupes.forEach(([url, titles]) => {
    console.log('  ' + titles.length + 'x: ' + url.split('/').pop());
    titles.forEach(t => console.log('    - ' + t));
  });

  // Count how many are from the original upload vs the sync scripts
  const fromSync = data.filter(d => d.preview_url.includes('/previews/'));
  const fromOriginal = data.filter(d => !d.preview_url.includes('/previews/'));
  console.log('\nFrom original upload (previews/ bucket):', fromOriginal.length);
  console.log('From sync scripts (previews/ path):', fromSync.length);
})();
