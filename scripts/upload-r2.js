const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const client = new S3Client({
  region: 'auto',
  endpoint: 'https://62a16e44fb8f2b2dbf56ff871c2d5505.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'bae216728d5107dec21e4cae48ad0512',
    secretAccessKey: 'c05efc9fd3576414c40d9bc57f3a8a4573179bc1bbed9e5cb578187f2de2a6bd',
  },
});

const localPath = process.argv[2];
const r2Key = process.argv[3];

if (!localPath || !r2Key) {
  console.error('Usage: node upload-r2.js <local-file> <r2-key>');
  process.exit(1);
}

const fileBuffer = fs.readFileSync(path.resolve(localPath));

client.send(new PutObjectCommand({
  Bucket: 'service-manuals-documents',
  Key: r2Key,
  Body: fileBuffer,
  ContentType: 'application/pdf',
})).then(() => console.log('Upload OK - ' + Math.round(fileBuffer.length / 1024 / 1024) + ' MB'))
  .catch(err => console.error('Error:', err.message));
