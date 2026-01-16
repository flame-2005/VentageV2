import { Id } from "@/convex/_generated/dataModel";

export const GA_EVENT = {
  SIGN_IN_CLICK: 'sign_in_click',
  SIGN_OUT_CLICK: 'sign_out_click',
  ARTICLE_CARD_CLICK: 'article_card_click',
  SIDEBAR_OPEN: 'sidebar_open',
  LIKE_CLICKED: 'like_clicked',
  SHARE_CLICKED: 'share_clicked',
  SIDEBAR_CLOSE: 'sidebar_close',
  TRACK_BLOG_CLICKED: 'track_blog_clicked',
  SUBMIT_BLOG_CLICKED: 'submit_blog_clicked',
  TRACK_COMPANY_CLICKED: 'track_company_clicked',
  FOLLOW_AUTHOR_CLICKED: 'follow_author_clicked',
  SEARCH_PERFORMED: 'search_performed',
} as const;

type GAEventParams = {
  category?: string;
  label?: string;
  value?: number;
  postId?: Id<"posts"> | string;
  company?: string;
  author?: string;
  blogUrl?: string;
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
