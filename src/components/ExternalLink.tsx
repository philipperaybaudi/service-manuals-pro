import Link from 'next/link';
import { ComponentProps } from 'react';

type ExternalLinkProps = ComponentProps<typeof Link>;

/**
 * Smart Link component: opens external links in new tab, internal links normally.
 */
export default function ExternalLink({ href, children, ...props }: ExternalLinkProps) {
  const hrefStr = typeof href === 'string' ? href : '';
  const isExternal = hrefStr.startsWith('http') || hrefStr.startsWith('mailto:');

  if (isExternal) {
    return (
      <Link href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </Link>
    );
  }

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}
