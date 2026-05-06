import { useEffect } from 'react';

const DESCRIPTION =
  'เครื่องคำนวณผ่อนบ้าน รีไฟแนนซ์ และเปรียบเทียบอัตราดอกเบี้ยบ้านของธนาคารไทยแบบดึงข้อมูลจริงจากฐานข้อมูลรายไตรมาส';
const TITLE = 'คำนวณดอกเบี้ยบ้าน & รีไฟแนนซ์ | Mortgage Calculator TH';

function upsertMeta(name, content, attr = 'name') {
  const selector = `meta[${attr}="${name}"]`;
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertLink(rel, href) {
  let link = document.head.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

function upsertJsonLd(id, data) {
  let script = document.head.querySelector(`script[data-seo-id="${id}"]`);
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seoId = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export default function Seo() {
  useEffect(() => {
    const canonical = window.location.href.split('#')[0];
    document.title = TITLE;
    upsertMeta('description', DESCRIPTION);
    upsertMeta('keywords', 'คำนวณผ่อนบ้าน, รีไฟแนนซ์บ้าน, ดอกเบี้ยบ้าน, MRR, สินเชื่อบ้าน, เปรียบเทียบธนาคาร');
    upsertMeta('robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    upsertMeta('theme-color', '#0d1117');
    upsertMeta('og:title', TITLE, 'property');
    upsertMeta('og:description', DESCRIPTION, 'property');
    upsertMeta('og:type', 'website', 'property');
    upsertMeta('og:url', canonical, 'property');
    upsertMeta('twitter:card', 'summary', 'name');
    upsertMeta('twitter:title', TITLE, 'name');
    upsertMeta('twitter:description', DESCRIPTION, 'name');
    upsertLink('canonical', canonical);

    upsertJsonLd('webapp', {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Mortgage Calculator TH',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      description: DESCRIPTION,
      inLanguage: 'th-TH',
      url: canonical,
    });
  }, []);

  return null;
}
