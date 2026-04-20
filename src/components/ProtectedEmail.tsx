'use client';
import { useEffect, useState } from 'react';

interface Props {
  encoded: string;       // email encodé en base64
  className?: string;
  showAddress?: boolean; // afficher l'adresse en texte ou juste le lien
  children?: React.ReactNode;
}

/**
 * Affiche un lien mailto protégé contre le scraping.
 * L'adresse email n'est jamais présente en clair dans le HTML —
 * elle est décodée côté client via JavaScript uniquement.
 */
export default function ProtectedEmail({ encoded, className, showAddress = true, children }: Props) {
  const [email, setEmail] = useState('');

  useEffect(() => {
    try {
      setEmail(atob(encoded));
    } catch {}
  }, [encoded]);

  if (!email) {
    // Pas de JS ou avant hydratation : aucune adresse visible
    return <span className={className}>{children ?? <span className="opacity-40">···</span>}</span>;
  }

  return (
    <a href={`mailto:${email}`} className={className}>
      {children ?? (showAddress ? email : <span>Envoyer un email</span>)}
    </a>
  );
}
