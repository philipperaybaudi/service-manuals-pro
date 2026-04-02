import Link from 'next/link';
import { ComponentProps } from 'react';

type ExternalLinkProps = ComponentProps<typeof Link>;

/**
 * Custom Link component that opens all links in a new tab.
 */
export default function ExternalLink({ children, ...props }: ExternalLinkProps) {
  return (
    <Link {...props} target="_blank" rel="noopener noreferrer">
      {children}
    </Link>
  );
}
