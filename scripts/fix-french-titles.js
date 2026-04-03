const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://ylsbqehotapcprfinsnu.supabase.co',
  'sb_secret_8OoI-uxIUlL_6nlbMLvVyA_up9uZZ6X'
);

// English translations for all French documents
const translations = {
  'edee9979-96bc-41f5-ae28-a34861dd7d7f': 'Canon EF 24-70mm f/2.8L USM Lens Repair Manual',
  'f7464390-0299-4ef4-87d0-817758ce66aa': 'Adria Prima 350 Caravan Brake Restoration Guide',
  '54013ce3-28a8-419c-b4ab-09a56fda3146': 'Photographic Flash Units Maintenance & Repair Manual',
  'e1a46690-d5a3-49ec-8764-6da89b7e8c46': 'AKAI GX-625 Reel-to-Reel Repair Manual',
  '7e8a831a-fabc-4625-be57-f3fc8bb66ee6': 'Canonflex RP Repair Tutorial',
  '6e9723b2-d15f-4bd1-9011-972cd5dc06e3': 'Fuji GW-690III GSW-690III / Fuji 670 & 617 Panoramic Repair Manual',
  'e21b0af1-c6a2-432f-9e24-5354c2536b82': 'Fuji HD-R User Manual',
  'dd8898d2-1d00-42e4-b8d0-e46853be25fd': 'Focaflex Service & Repair Manual',
  'a9a8c989-ebc5-4414-b385-91ae7c29aab2': 'FOCA PF2B User Manual',
  '731db6df-cd55-4f3f-aec5-2ef7e123dd5e': 'Nikon D80 User Manual',
  '801a35d2-e4d1-40b1-aa75-af77f244f27d': 'Wildlife Photography by Hasselblad',
  '3ba4adbd-06e9-46eb-9251-40333f742cf3': 'Telephoto Photography by Hasselblad',
  '6de78ff7-435a-4c90-a792-24174bd35f15': 'Habegger TDLE Lathe Technical Manual',
  '3ccb842b-1027-4093-9b6a-168f108e35a2': 'Hubsan H501S Pro FPV User Manual',
  '281f51a9-3963-4875-852c-f0addc9983f5': 'EMCO Compact 8 Lathe User Manual',
  '818bd503-0eb0-4b6e-bf40-2fbae16825f6': 'FOCA PF3 User Manual',
  'f2bfe72a-bf01-49d8-aa7b-dcd0a12fa337': 'Complete Metal Turning & Machining Course',
  'd0101af3-17d7-4e2f-a3d5-f7acb1acd2a6': 'LUREM C36 User & Maintenance Manual',
  'bb4a134e-88d6-4a02-96b8-85257c47ba5a': 'Metal Turning & Machining - Chevalier Jolys',
  '783f4f4e-83f7-4b1c-9844-4b91cfda8b0b': 'Leica M8 & M8.2 User Manual',
  '8c7240bf-30c7-4a7c-9992-0f335b3c1d3e': 'Toyota 1HD-FT Engine Service Manual',
  '2b376491-57fc-4641-b047-83a82df5ef8a': 'AKAI GX-646 Reel-to-Reel Troubleshooting Manual',
  'd0763b5c-6155-45ac-820b-dc30af94b075': 'LUREM C310 STI Technical Documentation',
  '817d1cff-fe4e-46a8-9ae0-5800eb92d198': 'LUREM CB310HZ User & Maintenance Manual',
  'b1291ae8-baef-460d-912d-50daaa6a1203': 'Noirot / Airelec / Acova Thermostat Troubleshooting Guide',
  '8578dd4b-25cb-475f-99dd-03f3819cac41': 'Zenit FS-12 & FS-3 Fotosnaiper User Manual',
  '87297102-1809-4431-9466-8ca7ddaefa77': 'Canon EF 24-105mm f/4L IS USM Lens Repair Manual',
  'f7df01ea-d2d4-4020-89ec-a8d9223def4a': 'Dugue C210E C260E C360ES User & Maintenance Manual',
  '2169a16c-bd42-4cd2-8dfc-b7f885bbd2eb': 'Canon EF 17-85mm IS USM Lens Repair Manual',
  'deef7674-5025-43db-babd-fce2103b49fd': 'EMCO Unimat Lathe User Manual',
  'e444c01c-7762-423f-b070-13e876cd0225': 'Leica M4 & M4.2 User Manual',
  '86255699-0aab-4306-8b8a-2ffdee8699ab': 'Foca Universel R / RC / URC Repair Manual',
  'b1e7bbce-dfc8-4002-b9ac-a7fdf0a5804c': 'Dugue C260 User & Maintenance Manual',
  '46df8e3c-22a6-4392-b934-32acebeed9bd': 'LUREM C20 Technical Manual',
  'f4626002-9d5d-4d83-a571-810bf70f7915': 'LUREM C2100 User & Maintenance Manual',
  '6cc2dee1-d819-4b7a-ace5-54b189aff4cb': 'Mamiya M645 1000S User Manual',
  '5d497393-3db1-4e1f-b597-22911093be29': 'Nikon FE User Manual',
  '6bc9998b-5962-4bcb-bbd5-be7ac2fd9865': 'Dugue Castor 200 250 410 520 User & Maintenance Manual',
  'c119a319-ba32-4206-bcb0-05a7bbf1d481': 'LUREM C266 User & Maintenance Manual',
  '756665db-3620-42ed-b6d5-0336f9950438': 'LUREM CB310SL User & Maintenance Manual',
  'b1f71f19-a33a-4eaa-92ac-3bd6674d7e7b': 'LUREM RD26F User & Maintenance Manual',
  '59cb8428-b024-4220-b6e8-878b4473fe33': 'From Dusk to Dawn Photography by Hasselblad',
  'f0253b5e-d4f9-4f9a-955f-8927996ec3da': 'LUREM C360 Technical Manual',
  '8437a257-bdea-429a-9cee-c27f22014378': 'FOCA Universel E1 User Manual',
  '7a8667e9-9a46-4115-8659-17f008dd4490': 'LUREM MF260L CB260TL User & Maintenance Manual',
  'f5046489-b4e0-4a62-9715-706af47df6bc': 'Leica M7 User Manual',
  'c763fcb3-4ccd-40ee-90f0-c782e784ef3a': 'Midland G6 User Manual',
  'fc8e72b2-7a87-4d8e-9b0a-424542b207cf': 'Nikon D1 User Manual',
  '6af34ff7-467b-4b84-a03c-f81af40b4824': 'Leica M4-P User Manual',
  '57135554-2d55-4d2c-a4d4-9a256f2f7a7e': 'Leica M6 User Manual',
  'b38cb281-5146-46b7-b589-bca53cf229e5': 'Leica M2 Repair Manual',
  '4fa87919-9c3f-4f9e-bf6b-b4690a3025cc': 'Leica M5 User Manual',
  '0c7a4d21-714b-433d-9b93-bc79c95e6c9e': 'Nikon D200 User Manual',
  'd7d4a5ab-ff2d-42aa-85dc-1ec7f604399b': 'LUREM C263 Electrical Wiring Diagrams',
  'ff60ba86-8860-44f4-9093-0a75859a8c54': 'Automatic Pet Feeder User Manual',
  '3cf6d1e6-8c72-4763-8297-0e5c69a798d8': 'Nikon D2X User Manual',
  '7c4ebfae-ef16-442a-b6cc-ca4277df9701': 'Nikon D3 User Manual',
  'edccd60c-3f09-4fb7-80a9-a4c43f334769': 'Nikon D300 User Manual',
  '9a1f9f2d-1ac4-4101-9053-dce4e76aa55c': 'Nikon F3 Repair Manual',
  '99e2b9ee-4031-4b78-8ba8-5be60a1bb620': 'Nikon S Microscope Fine Focus Spur Gear Repair Tutorial',
  '8e2d6082-82f3-4e32-8ea3-094388105f63': 'Minolta TC-1 Repair Tutorial',
  '55e188e2-9b52-4e44-bc18-b29c5476b1fd': 'Bombardier Outlander 400-800cc ATV Service Manual',
  'f59fcbf8-aafc-4c54-8de1-a09c8b8ce508': 'Minolta CLE Disassembly & Rangefinder Overhaul',
  'eb97ea34-d1db-412c-a930-92add7b90b7a': 'Nikon D70 Troubleshooting Manual',
  'af2cb6ed-3f22-470a-b988-8d3b32ec4ad2': 'Panasonic Toughbook CF-C2 User Manual (French)',
  '5aba0791-8979-4caa-93aa-94fcf3e7e9e8': 'Leica M3 User Manual',
  '8f6a8878-bbe2-4a78-9a07-887e9d7ec533': 'AKAI GX-4000 D/DB Troubleshooting Manual & Schematics',
  '0e9faef1-ac3b-485e-9215-0861fac868d1': 'Nikonos III Disassembly Tutorial',
  '128ea146-6dba-4936-a900-f2f4b43cf0de': 'Grundig Satellit 1400SL Pro User Manual',
  '77419293-2c88-453d-9ae3-1d369cc3ae25': 'Mini Cooper 1976-1989 Service Manual',
  '3b8a0655-0246-401b-9712-4c0ee2af3e88': 'Nikon F5 User Manual',
  '2fbfdfe2-d157-44e2-9980-22ba2e499cf6': 'Dugue C360 User & Maintenance Manual',
  'dba22ee7-d91a-456c-bbd9-5b40fddd1aef': 'AKAI GX-635D Reel-to-Reel Troubleshooting Manual',
  '3cdb0e19-4d50-4ffc-acf7-76e02368af07': 'Pentacon Six TL Repair Manual',
  '692bd516-63a3-4282-9f35-58c216b00f36': 'AKAI X-200D & X-201D Reel-to-Reel Troubleshooting Manual',
  '8daca115-8758-4784-b178-aced5593384a': 'Nikon F4 / F4s Complete Documentation',
  '5ac8c327-01e0-41a1-9774-bc5b0e9271c3': 'Olympus PEN-F PEN-FT PEN-FV Disassembly Manual',
  '4ec56545-142d-4c5b-9bc6-ece12e5ed76f': 'EMS Air-Flow Handy 2+ User Manual',
  '4b000f76-40be-4157-bcda-787e77435b59': 'Polaris Sportsman 500 ATV Parts List',
  '130298a5-fe18-4e19-b55e-b7e3648360c5': 'LUREM C260E C310E Exploded Views with Parts Lists',
  '19dce072-5b44-47fd-8dda-d092d0604941': 'Kodak Carousel 4200/4400/4600/5600 Slide Projector Service Manual',
  '030f4658-2f01-4107-b7ab-7a52c51ac547': 'Renault Scenic 2 Upholstery & Trim Service Manual',
  '3202562e-7bc5-47dd-9401-bff6dd20f53d': 'Renault Scenic 2 Chassis & Transmission Service Manual Vol. 2',
  'f50fa671-d199-480f-a50b-9022badd9716': 'STIHL MS192T Chainsaw User Manual',
  'd0d6a30c-a781-46b5-b644-5b167f0681de': 'Nikon D100 User Manual',
  '6b60682c-a972-4d5e-b50a-a77bce1e29a1': 'Revox B77 MKI & MKII Reel-to-Reel Troubleshooting Manual',
  '2c1f9ae0-5612-4a27-aa58-9163b3d32094': 'AKAI 4000 DS/DB Reel-to-Reel Descriptive Article',
  'a197ed12-f6e1-4d79-81eb-4f9abc1b50e8': 'Camera Light Seal Replacement Guide for SLR Cameras',
  '27761111-70f1-4cdd-8ba2-68a9360fb922': 'LUREM C2000 User & Maintenance Manual',
  'f9fe36c6-8148-4d5e-bfbf-816f7de8db74': 'Volvo Penta D2-54 & D2-75 Marine Engine User Manual',
  '40197c1f-7b51-4001-a28a-b94b3a6a3747': 'LUREM C2600 Technical Manual',
  '908ab0bc-a025-4954-a9b6-ee998b848f57': 'Bronica Zenza ETR / ETRS / ETRSi User Manual',
  'be56f893-2fcd-4f0d-92f6-dda15e32bef5': 'LUREM SC25 User & Maintenance Manual',
  '39e623b4-ab0b-41e2-bb8b-7c92ab2fb805': 'Canon Canonet 28 Leatherette Replacement Tutorial',
  '7731d015-750c-4adf-9cef-10564af88ca4': 'Pioneer A-209R & A-307R Amplifier User Manual',
  'acab331c-dd7e-4f89-9ed1-f51c6faf3aa7': 'Nikon F2 User Manual',
  'a5b0431f-f3e2-4c92-beee-98143ae9c9c6': 'Rolleiflex SL-66 Focus Mechanism Repair Manual',
  'b090952a-2e48-49a3-8e13-ec4b5314c499': 'Yashica Mat 124 & 124G Repair Tutorial',
  'a3d476e9-fcb8-4063-92fe-fa5868819d00': 'AKAI 4000DS MKII Troubleshooting Manual',
  '3fc6a1d2-51f4-4e0f-bd97-67099ee49b54': 'LUREM C210B Technical Manual',
  'd1f1059a-8aa4-41f8-92bd-51ac507aa035': 'Rolleiflex 2.8F Original Technician Repair Manual',
  '42591545-e1da-46d9-aa98-3803dab72960': 'Pentax LX Stuck Shutter Troubleshooting Tutorial',
  '96a6fb8d-d5a0-4a04-98dd-206ec0e08530': 'AKAI GX-77 Reel-to-Reel Troubleshooting Manual',
  'f86eb75d-e3d7-44b4-8641-6c62d1638939': 'Canon Canonet 28 Light Meter Repair Manual',
  '418b5dc6-106c-4858-a582-150a38fd16ba': 'Camera Lens Doublet Separation & Re-cementing Guide',
  '4143fdaa-71a1-4507-bd7a-a632d4723d68': 'Kodak Retina Reflex Complete Repair Manual',
  'd0970877-1688-448c-a5db-ed3bb05b3ccb': 'Minolta Miniflex 4x4 Disassembly Tutorial',
  '048ae4c0-c748-4593-a9fe-06f3f5cda8c6': 'AKAI GX-747 Reel-to-Reel Troubleshooting Manual',
  '1d78e656-b4eb-4399-94e7-6ff14613a57c': 'OPTI D180x300 Vario Lathe User Manual',
  'd06e12d1-3c67-4e10-bc55-e2e1b2c7d21d': 'Citroen Xsara Picasso User Manual (French)',
  'c84f1e24-96c8-40a1-9a17-db7954bb64d5': 'LUREM C7 Compact 7 User & Maintenance Manual',
  'f10aaa8e-938e-453a-8bc7-e291b08b63a5': 'Renault Scenic 2 Electrical Equipment Service Manual Vol. 2',
  'b1df20d3-3f95-4852-8b7a-9b8729505bcd': 'Polaris Sportsman 800 EFI ATV Parts List',
  '4c38f517-b9a4-4d8c-86a4-01f56af17081': 'Renault Scenic 2 Air Conditioning Service Manual Vol. 2',
  '5ef8cd0b-2dcb-4935-a00a-45f1fc091beb': 'Revox B710 MKII User Manual',
  '9fbedb2b-4213-498d-8326-34c435940125': 'Rolleiflex 6006 Complete Documentation',
  'af27ac1c-dc34-47d9-94d5-07071b8572a1': 'Yamaha DT 125 MX Workshop Service Manual',
  '75042964-2992-4b63-9b20-e8f420deb8f0': 'The Eye and Photography by Hasselblad',
  '257118fe-f879-49ab-aef2-ca4557af3fa2': 'Samsung GT-B2100 Repair Manual',
  '1cdb4be2-2dda-4d5b-9c5a-7fa8066cc1af': 'Sony KDL-55X4500 Repair Manual',
  '746f1740-6ae9-4336-b128-cab9b91e0549': 'Pentax P30 Stuck Shutter - Not Triggering Fix',
  'ff2e98f5-7349-4e9c-bc19-d6f5a2732dc2': 'Film Camera Light Meter Conversion for Mercury Battery Replacement',
  '53a11ba4-fab6-4e0e-8729-604665d5f855': 'Leica R5 Stuck Shutter - Not Triggering Fix',
  '996ce8e9-0f92-4aef-8567-28346581b871': 'Newgy Robo-Pong 2040, 1040 & 540 User Manual',
  'abee89da-34bb-4964-8660-dd0ff2564643': 'Suzuki Samurai 4x4 1986-1988 Service Manual',
  '267b760f-9125-44dc-869e-faf7e51bd9ac': 'LUREM C260E Technical Manual',
  'fec8dc20-5826-44fb-aa24-d61ffa300fc0': 'Nikon F4 Complete Disassembly Tutorial',
  '96415b3b-52c9-4b86-bd04-0ea0cb2e95b7': 'Contax 139Q Stuck Shutter Disassembly & Overhaul',
  'bfd12cbb-897b-406a-a657-ae96f82dffba': 'LUREM Router 7 User & Maintenance Manual',
  '02e19984-99cf-48a4-9e07-61f0436e7de5': 'Toyota Land Cruiser Series 6 HJ60 HJ61 FJ60 FJ62 User Manual',
  '1fa5e562-bb5f-42e9-ac8e-2271fd78e4bb': 'LUREM SAR 400 User & Maintenance Manual',
  '32e46616-272f-42d2-a8fe-1440342b8bc5': 'Nikon FE Stuck Mirror Repair Manual',
  '8da85a32-b9ed-4bac-b3cf-91d7cb4fb9c0': 'STIHL MS290 MS310 MS390 Chainsaw Troubleshooting Manual',
  '154a88c4-1528-48b4-bef8-d538c5903b13': 'Russian & Soviet Cameras 1840-1991',
  '6eff7220-185a-4e3b-9760-e5486ec5a46e': 'LUREM T30N User & Maintenance Manual',
  'd78708a5-7281-4d6b-b23e-ebec48c14bc7': 'Pentax 6x7 / 67 Stuck Mirror Troubleshooting Tutorial',
  '9a2c11a9-553a-4baf-84cf-82f13a804111': 'Yaesu FT-757GXII User Manual (French)',
  '1990422f-1879-4345-bda0-6ebcbf4e98d9': 'Hasselblad 500 C & CM Service Manual',
  'ecf92412-f74d-4099-9ed4-5803ec21c2e8': 'Rolleiflex SL-66 Stuck Mirror Repair Manual',
  'e55019ad-4012-4186-8537-bf3f1ec5fda7': 'Kaiser CPD 4214 Darkroom Timer User Manual',
  '6b7e01d8-5730-4c9b-bdea-93bc34f84c4f': 'Seagull 4 TLR Shutter Repair Tutorial',
  'f6d14d74-ae3e-494e-9d44-df98fde249ad': 'Yaesu FT-757GX Troubleshooting Manual',
  '8e951cff-1d98-43df-8b0d-8fb3fa346041': 'Canon PowerShot G6 Troubleshooting Manual',
  '3fdb8acb-de26-4d17-b020-e669203e87dd': 'Vestel 17IPS62 17IPS6-1/2/3 17PW06-2 17PW25-4 17IPS19-5/5P Board Repair Guide & Schematics',
};

(async () => {
  // Get all docs that need updating
  const { data: allDocs } = await sb.from('documents')
    .select('id, title, description, seo_description, seo_title')
    .eq('active', true);

  const ids = Object.keys(translations);
  console.log(`Processing ${ids.length} documents...`);

  let success = 0;
  let errors = 0;

  for (const id of ids) {
    const newTitle = translations[id];
    const doc = allDocs.find(d => d.id === id);
    if (!doc) { console.log(`SKIP ${id}: not found`); continue; }

    const oldTitle = doc.title;
    const updates = { title: newTitle };

    // Fix description: replace old French title with new English title
    if (doc.description) {
      let desc = doc.description;
      // Replace French title references
      desc = desc.replace(new RegExp(escapeRegex(oldTitle), 'g'), newTitle);
      // Also fix common French phrases in descriptions
      desc = desc.replace(/Cette documentation vous permettra d'utiliser et d'entretenir/g, 'This documentation will help you use and maintain');
      desc = desc.replace(/Cette documentation/g, 'This documentation');
      desc = desc.replace(/permettra/g, 'will help');
      desc = desc.replace(/avec une totale confiance/g, 'with complete confidence');
      desc = desc.replace(/tronçonneuse/g, 'chainsaw');
      desc = desc.replace(/appareil photo/g, 'camera');
      desc = desc.replace(/appareils photos/g, 'cameras');
      desc = desc.replace(/Manuel de réparation/g, 'Repair manual');
      desc = desc.replace(/Manuel d'entretien/g, 'Maintenance manual');
      desc = desc.replace(/Notice d'utilisation/g, 'User manual');
      desc = desc.replace(/Documentation technique/g, 'Technical documentation');
      desc = desc.replace(/Schéma électrique/g, 'Electrical schematic');
      desc = desc.replace(/Schémas? du câblage électrique/g, 'Electrical wiring diagrams');
      desc = desc.replace(/en français/g, '(French)');
      updates.description = desc;
    }

    // Fix seo_description
    if (doc.seo_description) {
      let seo = doc.seo_description;
      seo = seo.replace(new RegExp(escapeRegex(oldTitle), 'g'), newTitle);
      // Remove French words from SEO description
      seo = seo.replace(/Entretien et réparation des/g, 'Service & repair manual for');
      seo = seo.replace(/Dépannage/g, 'Troubleshooting');
      seo = seo.replace(/Manuel d'utilisation et d'entretien/g, 'User & maintenance manual');
      seo = seo.replace(/Notice technique/g, 'Technical manual');
      seo = seo.replace(/Documentation technique/g, 'Technical documentation');
      seo = seo.replace(/en français/g, '(French)');
      updates.seo_description = seo;
    }

    // Fix seo_title
    if (doc.seo_title) {
      let seoTitle = doc.seo_title;
      seoTitle = seoTitle.replace(new RegExp(escapeRegex(oldTitle), 'g'), newTitle);
      updates.seo_title = seoTitle;
    }

    const { error } = await sb.from('documents').update(updates).eq('id', id);

    if (error) {
      console.error(`FAIL ${id} (${oldTitle}): ${error.message}`);
      errors++;
    } else {
      success++;
      if (success % 20 === 0) console.log(`  ${success}/${ids.length} done...`);
    }
  }

  console.log(`\nDone: ${success} updated, ${errors} errors`);
})();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
