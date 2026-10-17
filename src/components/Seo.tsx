import { useEffect } from 'react';

export function Seo({ title, description, noindex = false }: { title: string; description: string; noindex?: boolean }) {
  useEffect(() => {
    document.title = `${title} | دليل غزة للمساعدات`;
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.append(tag);
    }
    tag.content = description;
    const updateProperty = (property: string, content: string) => {
      let meta = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.append(meta);
      }
      meta.content = content;
    };
    updateProperty('og:title', `${title} | دليل غزة للمساعدات`);
    updateProperty('og:description', description);
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.append(robots);
    }
    robots.content = noindex ? 'noindex,nofollow' : 'index,follow';
  }, [title, description, noindex]);
  return null;
}
