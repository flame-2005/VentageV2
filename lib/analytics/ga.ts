export const GA_EVENT = {
  SIGN_IN_CLICK: 'sign_in_click',
} as const;

type GAEventParams = {
  category?: string;
  label?: string;
  value?: number;
};

type GtagEvent = (
  action: string,
  eventName: string,
  params?: Record<string, unknown>
) => void;

declare global {
  interface Window {
    gtag?: GtagEvent;
  }
}

export const trackEvent = (
  eventName: (typeof GA_EVENT)[keyof typeof GA_EVENT],
  params?: GAEventParams
) => {
  if (typeof window === 'undefined') return;
  if (!window.gtag) return;

  window.gtag('event', eventName, {
    ...params,
  });
};
