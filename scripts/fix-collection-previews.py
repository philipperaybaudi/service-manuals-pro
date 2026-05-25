import os, sys
sys.stdout.reconfigure(encoding='utf-8')

src_dir = r'C:\Users\adm\Documents\SHEMATHEQUE\DOCS EN LIGNE\Photographie\COLLECTION'
dst_dir = r'C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories\Photographie\COLLECTION'

os.makedirs(dst_dir, exist_ok=True)

copied = 0
for fn in os.listdir(src_dir):
    if fn.endswith('.jpg'):
        dst = os.path.join(dst_dir, fn)
        if not os.path.exists(dst):
            src = os.path.join(src_dir, fn)
            with open(src, 'rb') as f:
                data = f.read()
            with open(dst, 'wb') as f:
                f.write(data)
            print(f'  Copied: {fn}')
            copied += 1

print(f'Done: {copied} JPGs copied to DOSSIER SOURCE')
