#!/usr/bin/env python3
"""
Met à jour data/essais.json à partir d'un fichier Excel.

Usage:
    python update_data.py [chemin/vers/essais.xlsx]

Si aucun chemin n'est fourni, cherche essais.xlsx ou essais.xls à la racine.
"""
import json
import math
import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("Erreur : pandas n'est pas installé.")
    print("Installer avec : pip install pandas openpyxl xlrd")
    sys.exit(1)


def clean(v):
    """Nettoie une valeur (gère NaN, None, chaînes vides)."""
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    if pd.isna(v):
        return None
    s = str(v).strip()
    return s if s else None


def find_input_file():
    """Cherche le fichier source dans les emplacements courants."""
    candidates = [
        Path('essais.xlsx'),
        Path('essais.xls'),
        Path('data/essais.xlsx'),
        Path('data/essais.xls'),
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def main():
    # Déterminer le fichier d'entrée
    if len(sys.argv) > 1:
        src = Path(sys.argv[1])
    else:
        src = find_input_file()

    if not src or not src.exists():
        print("Erreur : fichier source introuvable.")
        print("Usage : python update_data.py [chemin/vers/essais.xlsx]")
        sys.exit(1)

    print(f"Lecture de : {src}")
    df = pd.read_excel(src)

    # Vérifier les colonnes attendues
    expected = {'id', 'nom', 'sponsor', 'phase', 'categorie', 'statut',
                'interventions', 'population', 'exigences', 'notes',
                'contact_name', 'contact_email', 'contact_phone', 'maj'}
    missing = expected - set(df.columns)
    if missing:
        print(f"⚠ Colonnes manquantes : {missing}")
        print(f"  Colonnes présentes : {list(df.columns)}")

    # Construire les records
    records = []
    for _, row in df.iterrows():
        rec = {}
        for col in df.columns:
            val = row[col]
            if col == 'maj':
                try:
                    rec[col] = pd.to_datetime(val).strftime('%Y-%m-%d') if pd.notna(val) else None
                except Exception:
                    rec[col] = clean(val)
            else:
                rec[col] = clean(val)
        records.append(rec)

    # Écrire le JSON
    out = Path('data/essais.json')
    out.parent.mkdir(exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"✓ {len(records)} essais écrits dans {out}")
    print("\nProchaines étapes :")
    print("  git add data/essais.json")
    print("  git commit -m 'Mise à jour des essais'")
    print("  git push")


if __name__ == '__main__':
    main()
