const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://ylsbqehotapcprfinsnu.supabase.co',
  'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X'
);

const fixes = {
  '257118fe-f879-49ab-aef2-ca4557af3fa2': '<p>Complete workshop manual for the Samsung GT-B2100.</p><p>81-page complete workshop manual. Original manufacturer version for service workshops.</p><h3>Topics covered:</h3><ul><li>Specifications</li><li>Precautions</li><li>Accessories & Diagnostics</li><li>Maintenance software download & usage</li><li>Housing disassembly</li><li>Complete disassembly of all internal sub-components</li><li>Spare parts list & references</li><li>Diagrams & operation schematics</li></ul>',

  'f7464390-0299-4ef4-87d0-817758ce66aa': '<p>Documentation for the Adria Prima 350 caravan brake restoration.</p><p>19-page documentation.</p><p>Essential documentation for maintenance and use of this equipment.</p>',

  'dd8898d2-1d00-42e4-b8d0-e46853be25fd': '<p>Service and repair manual for the Focaflex cameras.</p><p>27-page documentation.</p><h3>Topics covered:</h3><ul><li>Top cover removal</li><li>Protective cover removal</li><li>Front plate removal</li><li>Reflex assembly service</li><li>Shutter disassembly</li><li>Sprocket wheel removal</li><li>Shutter cleaning</li><li>Collector lens cleaning</li><li>Exploded views with spare parts references</li></ul>',

  'a9a8c989-ebc5-4414-b385-91ae7c29aab2': '<p>User manual for the FOCA PF2B.</p><p>32-page user manual.</p><h3>Topics covered:</h3><ul><li>General information</li><li>Camera description</li><li>Film loading & unloading</li><li>Handling & shutter release</li><li>Lens adjustment</li><li>Shooting operations</li><li>Important recommendations</li></ul>',

  '418b5dc6-106c-4858-a582-150a38fd16ba': '<p>Guide for camera lens doublet separation and re-cementing.</p><h3>Topics covered:</h3><ul><li>Why and how optical elements are cemented together</li><li>Canada balsam and UV adhesives (single and multi-component)</li><li>Problem solving approaches</li><li>Separating cemented doublet elements</li><li>Oven separation techniques and considerations</li><li>Lens cleaning</li><li>UV re-cementing</li><li>Lens reassembly</li><li>Specialist professional contacts</li></ul>',

  '281f51a9-3963-4875-852c-f0addc9983f5': '<p>User manual for the EMCO Compact 8 lathe.</p><p>125-page user manual.</p><p>Essential documentation for anyone wishing to operate and maintain this machine tool.</p><h3>Topics covered:</h3><ul><li>Setup & getting started</li><li>Machine components</li><li>Control elements</li><li>Working with the Compact 8</li><li>Lathe accessories</li><li>Backlash adjustment</li><li>Lubrication plan</li><li>Wiring schematic</li><li>Complete spare parts list</li></ul>',

  '818bd503-0eb0-4b6e-bf40-2fbae16825f6': '<p>User manual for the FOCA PF3.</p><p>32-page user manual.</p><h3>Topics covered:</h3><ul><li>General information</li><li>Camera description</li><li>Film loading & unloading</li><li>Handling & shutter release</li><li>Lens adjustment</li><li>Shooting operations</li><li>Important recommendations</li></ul>',

  '86255699-0aab-4306-8b8a-2ffdee8699ab': '<p>Repair manual for the Foca Universel R, Universel RC, and Universel URC.</p><p>60-page repair manual.</p><h3>Topics covered:</h3><ul><li>Disassembly instructions</li><li>Shutter mechanism repair</li><li>Sub-assembly separation</li><li>Rangefinder extraction</li><li>Upper mechanism</li><li>Curtain replacement</li><li>First & second curtain levers</li><li>Counter gear disassembly</li><li>Delayed release timer</li><li>Tool references</li><li>Mechanical exploded views with part numbers</li><li>Step-by-step disassembly photographs</li></ul>',

  '8437a257-bdea-429a-9cee-c27f22014378': '<p>User manual for the FOCA Universel E1.</p><p>Essential documentation for use and maintenance of this camera.</p>',

  '8f6a8878-bbe2-4a78-9a07-887e9d7ec533': '<p>Complete workshop manual for the AKAI GX-4000 D/DB.</p><p>Essential documentation for maintenance and troubleshooting.</p><h3>Topics covered:</h3><ul><li>Technical specifications for D & DB models</li><li>Tape recorder disassembly</li><li>Sub-assembly locations</li><li>Reel drive platter exploded view</li><li>Mechanical adjustments</li><li>Head adjustments</li><li>Playback & recording preamplifier calibration</li><li>Electronic component identification on PCBs with values</li><li>Electronic component nomenclature</li><li>Electronic schematics with component index and PCB locations</li></ul>',

  '3cdb0e19-4d50-4ffc-acf7-76e02368af07': '<p>Complete workshop manual for the Pentacon Six TL.</p><h3>Topics covered:</h3><ul><li>Top cover disassembly (illustrated)</li><li>Focal plane shutter disassembly (illustrated)</li><li>Step-by-step shutter reassembly</li><li>Pentaprism & viewfinder disassembly and cleaning</li><li>Cocking arm and speed mechanism parts positioning</li><li>General notes</li><li>Pre-CLA disassembly instructions</li><li>Post-CLA reassembly instructions</li><li>Final assembly before calibration & testing</li><li>Tool list</li><li>Mechanical exploded views with part references</li></ul>',

  '4ec56545-142d-4c5b-9bc6-ece12e5ed76f': '<p>User manual for the EMS Air-Flow Handy 2+ air polisher.</p><p>72-page user manual.</p><p>Essential documentation for maintenance and use of this equipment.</p><h3>Topics covered:</h3><ul><li>Handpiece components</li><li>Powder chamber cap</li><li>Body & adapter</li><li>Powder outlet tube</li><li>Water outlet & nozzle</li><li>Cap ring & dome</li><li>Powder chamber seal</li><li>Rear & front tubes</li><li>Handpiece connector & O-rings</li><li>Cleaning needles (long & short)</li></ul>',

  '3202562e-7bc5-47dd-9401-bff6dd20f53d': '<p>Complete workshop manual for the Renault Scenic 2 transmission and chassis.</p><p>75-page complete workshop manual. Original manufacturer version for service workshops.</p><h3>Topics covered:</h3><ul><li>Identification</li><li>Clutch mechanism, disc & release bearing</li><li>Flywheel & gear ratios</li><li>Lubricants & ingredients</li><li>Manual gearbox removal & refitting</li><li>Clutch shaft lip seal</li><li>Differential output seal</li><li>Oil change, filling & levels</li><li>Torque converter timing check</li><li>Line pressure testing</li><li>Hydraulic distributor</li></ul>',

  'a197ed12-f6e1-4d79-81eb-4f9abc1b50e8': '<p>Guide for replacing light seals on SLR cameras.</p><h3>Topics covered:</h3><ul><li>Tools and materials needed</li><li>Camera interior overview</li><li>Important notes</li><li>Replacing groove foam seals</li><li>Replacing mirror cushion foam</li><li>Additional notes</li></ul>',

  'a3d476e9-fcb8-4063-92fe-fa5868819d00': '<p>Complete workshop manual for the AKAI 4000DS MKII.</p><p>43-page complete workshop manual. Original manufacturer version for service workshops.</p><h3>Topics covered:</h3><ul><li>Technical specifications</li><li>Flutter, frequency response, signal-to-noise ratio, harmonic distortion testing</li><li>Tape recorder disassembly</li><li>Reel drive platter exploded view</li><li>Head adjustments and calibration</li><li>Playback & recording preamplifier calibration</li><li>Electronic component identification on PCBs</li><li>Head assembly mechanical exploded view with part references</li><li>Reel drive & motor assembly exploded views</li><li>Control mechanism exploded view with parts list</li><li>Electronic schematics with component index and PCB locations</li></ul>',

  '746f1740-6ae9-4336-b128-cab9b91e0549': '<p>Troubleshooting guide for the Pentax P30 with stuck shutter that no longer triggers.</p><p>Step-by-step diagnosis and repair instructions.</p>',

  '53a11ba4-fab6-4e0e-8729-604665d5f855': '<p>Troubleshooting guide for the Leica R4-MOT / R5 with stuck shutter that no longer triggers.</p><p>Step-by-step diagnosis and repair instructions.</p>',

  '96415b3b-52c9-4b86-bd04-0ea0cb2e95b7': '<p>Troubleshooting guide for the Contax 139Q with stuck shutter or irregular triggering.</p><p>33-page manual with step-by-step diagnosis and repair instructions.</p>',

  'd78708a5-7281-4d6b-b23e-ebec48c14bc7': '<p>Troubleshooting tutorial for the Pentax 6x7 / 67 stuck mirror issue.</p><p>Step-by-step diagnosis and repair instructions.</p>',

  '030f4658-2f01-4107-b7ab-7a52c51ac547': '<p>Complete workshop manual for the Renault Scenic 2 upholstery and trim.</p><p>Original manufacturer version for service workshops.</p><p>Essential documentation for maintenance and restoration.</p>',
};

(async () => {
  const ids = Object.keys(fixes);
  console.log('Rewriting ' + ids.length + ' descriptions...');

  let ok = 0, fail = 0;
  for (const id of ids) {
    const { error } = await sb.from('documents').update({ description: fixes[id] }).eq('id', id);
    if (error) { console.error('FAIL', id, error.message); fail++; }
    else ok++;
  }

  console.log('Done: ' + ok + ' updated, ' + fail + ' errors');

  // Final check
  const { data } = await sb.from('documents').select('id, title, description').eq('active', true);
  const frWords = /\b(les|des|une|dans|pour|avec|vous|sont|qui|que|dont|votre|cette|mais|ses|leur|nos|vos|tous|nous|avez|faire|peut|entre|sous|vers|aussi|comme|chez|donc|selon|chaque|autre|lors|aucun|apres|avant|encore|remplacer|remplacement|interieur|importante|mousses?|isolantes?|rainures?|amortissement|miroir|obturateur|capot|demontage|platine|mecanisme|pellicule|chargement|devisser|nettoyage|boitier)\b/gi;

  const remaining = data.filter(function(d) {
    if (!d.description) return false;
    var plain = d.description.replace(/<[^>]*>/g, ' ');
    var matches = plain.match(frWords);
    return matches && matches.length >= 2;
  });

  console.log('Docs still with French words: ' + remaining.length);
  remaining.forEach(function(d) {
    var plain = d.description.replace(/<[^>]*>/g, ' ');
    var matches = plain.match(frWords);
    console.log('  - ' + d.title + ' (' + matches.slice(0, 5).join(', ') + ')');
  });
})();
