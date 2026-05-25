"""
toyota-rename-pdfs.py
Renomme les 80 PDFs Toyota avec noms descriptifs + prix.
Les 4 fichiers inconnus (35008, 36043E, MAC-1004, STI006E) sont exclus.
"""
from pathlib import Path

TOYOTA_DIR = Path(r'C:\Users\adm\Documents\SHEMATHEQUE\DOSSIER SOURCE\Catégories\Automobile\TOYOTA')

RENAMES = {
    # --- Série 60 (1980-1990) ---
    '36044E $35.pdf':  'Toyota LC60 Heavy Duty Chassis Body Repair Manual FJ6 BJ6 HJ6 $35.pdf',
    '36262E.pdf':      'Toyota LC60 Heavy Duty Chassis Body Repair Manual 1984 $30.pdf',
    'RM033E.pdf':      'Toyota LC60 Heavy Duty Chassis Body Repair Manual Supplement 1985 $15.pdf',
    '36104E.pdf':      'Toyota 2F Engine Repair Manual 1980 $18.pdf',
    '98126E.pdf':      'Toyota 2F Engine Repair Manual 98126E $18.pdf',
    '36253E.pdf':      'Toyota LC60 3F Engine Repair Manual 1984 $18.pdf',
    'RM134E.pdf':      'Toyota 3F-E Engine Repair Manual Supplement 1988 $15.pdf',
    '36047E.pdf':      'Toyota B 2B 3B Engine Repair Manual 1980 $18.pdf',
    'RM024E.pdf':      'Toyota 11B 13B 13B-T Engine Repair Manual 1985 $18.pdf',
    'RM035E.pdf':      'Toyota B 3B 11B 13B 13B-T Engine Repair Manual 1986 $18.pdf',
    'RM132E.pdf':      'Toyota B 3B 11B 14B Engine Repair Manual 1988 $18.pdf',
    '36048E.pdf':      'Toyota 2H Engine Repair Manual 1980 $18.pdf',
    'RM012E.pdf':      'Toyota 2H 12H-T Engine Repair Manual 1985 $18.pdf',
    '36380E.pdf':      'Toyota 3Y 22R 3F Engine Emission Control Repair Manual 1984 $15.pdf',
    '36237E.pdf':      'Toyota H41 H42 H50 H55F Transmission Repair Manual 1982 $15.pdf',
    '36264E.pdf':      'Toyota A440F A440L Automatic Transmission Repair Manual 1984 $18.pdf',
    '98961.pdf':       'Toyota 1982 Commercial Vehicles Electrical Wiring Diagram $15.pdf',
    '36683F.pdf':      'Toyota 1983 Commercial Vehicles Electrical Wiring Diagram $15.pdf',
    '36713F.pdf':      'Toyota 1985 Passenger Cars Electrical Wiring Diagram $15.pdf',
    'EWD046F.pdf':     'Toyota 1988 Commercial Vehicles Electrical Wiring Diagram $15.pdf',
    'EWD066F.pdf':     'Toyota 1989 Commercial Vehicles Electrical Wiring Diagram $15.pdf',
    'MAC-501.pdf':     'Toyota LC60 FJ60 Air Conditioner Installation Manual $15.pdf',
    'MAC-515.pdf':     'Toyota LC60 HJ60 Air Conditioner Installation Manual $15.pdf',
    'RAC-015.pdf':     'Toyota Land Cruiser Air Conditioning Repair Manual All Season $15.pdf',
    '608131.pdf':      'Toyota LC60 Station Wagon Technical Specifications 1986 $15.pdf',

    # --- Série 80 (1990-1998) ---
    'RM184E.pdf':      'Toyota LC80 Chassis Body Repair Manual FJ80 HZJ80 HDJ80 1990 $35.pdf',
    'RM290E.pdf':      'Toyota LC80 Chassis Body Repair Manual Supplement 1992 $22.pdf',
    'RM315E.pdf':      'Toyota LC70 LC80 Chassis Body Repair Manual Supplement 1992 $22.pdf',
    'RM434E.pdf':      'Toyota LC80 Chassis Body Repair Manual Supplement FZJ80 HZJ80 HDJ80 1995 $20.pdf',
    'RM534E.pdf':      'Toyota LC80 Chassis Body Repair Manual Supplement 1996 $18.pdf',
    'BRM050E.pdf':     'Toyota LC80 Collision Damage Repair Manual FZJ80 HZJ80 HDJ80 1995 $15.pdf',
    'RM283E.pdf':      'Toyota 1FZ-F Engine Repair Manual 1992 $18.pdf',
    'RM321E.pdf':      'Toyota 1FZ-F 1FZ-FE Engine Repair Manual 1992 $22.pdf',
    'RM436E.pdf':      'Toyota 1FZ-FE Engine Repair Manual Supplement 1995 $15.pdf',
    'RM172E.pdf':      'Toyota 1PZ 1HZ 1HD-T Engine Repair Manual 1990 $18.pdf',
    'RM437E.pdf':      'Toyota 1HD-FT Engine Repair Manual 1995 $18.pdf',
    'RM523E.pdf':      'Toyota 1HD-FT Engine Repair Manual Supplement 1996 $15.pdf',
    'ERM068E.pdf':     'Toyota 3F 3F-E Engine Emission Control Repair Manual 1990 $15.pdf',
    'ERM096E.pdf':     'Toyota 1FZ-FE Engine Emission Control Repair Manual 1992 $15.pdf',
    'ERM111E.pdf':     'Toyota 1HD-FT Engine Emission Control Repair Manual 1995 $15.pdf',
    'RM188E.pdf':      'Toyota A441L A440F A442F Automatic Transmission Repair Manual 1990 $18.pdf',
    'RM314E.pdf':      'Toyota A442F Automatic Transmission Repair Manual 1992 $15.pdf',
    'RM314E-Supp.pdf': 'Toyota LC80 FZJ80 HZJ80 A442F Transmission Supplement 1995 $15.pdf',
    'ATH021F.pdf':     'Toyota A440F A442F Transmission Hydraulic Circuit Diagrams 1990 $15.pdf',
    'ATH031F.pdf':     'Toyota A442F Transmission Hydraulic Circuit Diagrams FZJ80 HDJ80 1992 $15.pdf',
    'EWD090F.pdf':     'Toyota LC80 Electrical Wiring Diagram 1990 $18.pdf',
    'EWD114F.pdf':     'Toyota LC80 Electrical Wiring Diagram 1991 $15.pdf',
    'EWD169F.pdf':     'Toyota LC80 Electrical Wiring Diagram 1993 $18.pdf',
    'EWD232F.pdf':     'Toyota LC80 Electrical Wiring Diagram 1994 $18.pdf',
    'EWD272F.pdf':     'Toyota LC80 Electrical Wiring Diagram 1995 $18.pdf',
    'MAC-1019.pdf':    'Toyota LC80 Air Conditioner Installation Manual HZJ80R HDJ80R FJ80R $15.pdf',
    'MAC-1032.pdf':    'Toyota LC80 Air Conditioner Installation Manual FZJ80R $15.pdf',
    'MAC-1067.pdf':    'Toyota LC80 Air Conditioner Installation Manual HZJ80R HFC-134a $15.pdf',
    'NCF064E.pdf':     'Toyota LC80 New Car Features 1990 $18.pdf',
    'AANCF004.pdf':    'Toyota LC80 New Car Features Supplement 1995 $15.pdf',

    # --- Série 90 Prado (1996-2002) ---
    'RM517E.pdf':      'Toyota Land Cruiser Prado 90 Chassis Body Repair Manual RZJ90 KZJ90 1996 $35.pdf',
    'RM627E.pdf':      'Toyota Land Cruiser Prado 90 Chassis Body Repair Manual Supplement 1998 $18.pdf',
    'RM702E.pdf':      'Toyota Land Cruiser Prado 90 Chassis Body Repair Manual Supplement 1999 $25.pdf',
    'RM805E.pdf':      'Toyota Land Cruiser Prado 90 Chassis Body Repair Manual Supplement 2000 $18.pdf',
    'BRM061E.pdf':     'Toyota Land Cruiser Prado 90 Collision Damage Repair Manual 1996 $15.pdf',
    'RM519E.pdf':      'Toyota 5VZ-FE Engine Repair Manual 1996 $18.pdf',
    'RM703E.pdf':      'Toyota 5VZ-FE Engine Repair Manual Supplement 1999 $18.pdf',
    'RM898E.pdf':      'Toyota 5VZ-FE Engine Repair Manual Supplement 2001 $18.pdf',
    'RM520E.pdf':      'Toyota 2L 3L Engine Repair Manual 1996 $18.pdf',
    'RM521E.pdf':      'Toyota 3RZ-F 3RZ-FE Engine Repair Manual 1996 $18.pdf',
    'RM704E.pdf':      'Toyota 3RZ-FE Engine Repair Manual Supplement 1999 $18.pdf',
    'RM353E.pdf':      'Toyota 1KZ-T Engine Repair Manual 1993 $18.pdf',
    'RM522E.pdf':      'Toyota 1KZ-T 1KZ-TE Engine Repair Manual Supplement 1996 $18.pdf',
    'RM710E.pdf':      'Toyota 1KZ-TE Engine Repair Manual 1999 $20.pdf',
    'RM790E.pdf':      'Toyota 1KZ-TE Engine Repair Manual Supplement 2000 $18.pdf',
    'RM528E.pdf':      'Toyota A343F Automatic Transmission Repair Manual 1996 $15.pdf',
    'EWD269F.pdf':     'Toyota Land Cruiser Prado 90 Electrical Wiring Diagram 1996 $22.pdf',
    'EWD340F.pdf':     'Toyota Land Cruiser Prado 90 Electrical Wiring Diagram 1998 $18.pdf',
    'EWD376F.pdf':     'Toyota Land Cruiser Prado 90 Electrical Wiring Diagram 2000 $18.pdf',
    'MAC-A458.pdf':    'Toyota Land Cruiser Prado 90 Air Conditioning Air Mix Door Manual $15.pdf',
    'MAC-A486.pdf':    'Toyota Land Cruiser Prado 90 VZJ95R Air Conditioner Installation Manual $15.pdf',
    'MAC-A510.pdf':    'Toyota Land Cruiser Prado 90 KZJ95R Air Conditioner Installation Manual $15.pdf',
    'MAC-1079.pdf':    'Toyota Land Cruiser Prado 90 VZJ95R Air Conditioner Installation Manual Nippondenso $15.pdf',
    'NCF131E.pdf':     'Toyota Land Cruiser Prado 90 New Car Features May 1996 $18.pdf',
    'NCF195E.pdf':     'Toyota Land Cruiser Prado 90 New Car Features Supplement 2000 $18.pdf',
}

print(f'\n{"="*65}')
print(f'  TOYOTA — RENOMMAGE ({len(RENAMES)} fichiers)')
print(f'{"="*65}\n')

ok = 0
missing = 0
conflict = 0

for old_name, new_name in RENAMES.items():
    src = TOYOTA_DIR / old_name
    dst = TOYOTA_DIR / new_name
    if not src.exists():
        print(f'  ABSENT  : {old_name}')
        missing += 1
        continue
    if dst.exists() and src != dst:
        print(f'  CONFLIT : {new_name} existe déjà')
        conflict += 1
        continue
    src.rename(dst)
    print(f'  OK : {old_name}')
    print(f'    → {new_name}')
    ok += 1

print(f'\n{"="*65}')
print(f'  BILAN : {ok} renommés | {missing} absents | {conflict} conflits')
print(f'  Non traités (à faire manuellement) :')
print(f'    - 35008.pdf')
print(f'    - 36043E.pdf')
print(f'    - MAC-1004.pdf')
print(f'    - STI006E.pdf')
print(f'{"="*65}\n')
