import { Button } from '@chakra-ui/react';

/** Shared Chakra UI v3 button styled with LinkUsaha's visual tokens. */
export function ActionButton({ children, className = 'btn', ...props }) {
  return <Button className={className} {...props}>{children}</Button>;
}
