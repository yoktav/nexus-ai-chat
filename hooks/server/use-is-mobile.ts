import { headers } from 'next/headers';

export function useIsMobile(): boolean {
  const headersList = headers();
  const userAgent = headersList.get('user-agent') || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

  return mobileRegex.test(userAgent);
}
