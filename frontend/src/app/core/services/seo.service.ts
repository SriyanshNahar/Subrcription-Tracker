import { Injectable, Inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface SeoConfig {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  robots?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(DOCUMENT) private dom: any
  ) { }

  /**
   * Generates and updates dynamic SEO tags for the active route.
   * @param config SEO Configuration options
   */
  generateTags(config: SeoConfig): void {
    // 1. Set Page Title
    const fullTitle = `${config.title} | Trackovo`;
    this.titleService.setTitle(fullTitle);

    // 2. Set Basic Meta Tags
    this.metaService.updateTag({ name: 'description', content: config.description });

    const defaultKeywords = 'subscription tracker, track subscriptions, expense manager, save money, graveyard, pricing, Trackovo';
    this.metaService.updateTag({ name: 'keywords', content: config.keywords || defaultKeywords });
    this.metaService.updateTag({ name: 'robots', content: config.robots || 'index, follow' });

    // 3. Open Graph Metadata
    this.metaService.updateTag({ property: 'og:title', content: fullTitle });
    this.metaService.updateTag({ property: 'og:description', content: config.description });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({ property: 'og:url', content: this.dom.URL });
    if (config.image) {
      this.metaService.updateTag({ property: 'og:image', content: config.image });
    } else {
      this.metaService.updateTag({ property: 'og:image', content: '/favicon.png' });
    }

    // 4. Twitter Card Metadata
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: fullTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: config.description });
    if (config.image) {
      this.metaService.updateTag({ name: 'twitter:image', content: config.image });
    } else {
      this.metaService.updateTag({ name: 'twitter:image', content: '/favicon.png' });
    }

    // 5. Update Canonical Link
    this.updateCanonicalUrl();
  }

  /**
   * Safely adds or updates the canonical link element in the HTML head.
   */
  private updateCanonicalUrl(): void {
    let link: HTMLLinkElement = this.dom.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.dom.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.dom.head.appendChild(link);
    }
    link.setAttribute('href', this.dom.URL);
  }
}
