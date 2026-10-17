import { describe, expect, it } from 'vitest';
import { demoAids, demoOrganizations } from './demo';

describe('starter directory data', () => {
  it('includes the official WFP country page but does not associate demo aid with WFP', () => {
    const wfp = demoOrganizations.find((organization) => organization.slug === 'wfp-palestine');
    expect(wfp?.official_website).toBe('https://www.wfp.org/countries/palestine');
    expect(wfp?.support_url).toBe('https://aidhotline.wfp.org/palestine');
    expect(wfp?.registration_url).toBe('https://pal.beneficiaryregistration.cbt.wfp.org/form/consent');
    expect(wfp?.verification_status).toBe('verified');
    expect(demoAids[0].organization).toBeNull();
    expect(demoAids[0].registration_url).toBeNull();
  });

  it('lists requested organizations without inventing registration links', () => {
    const slugs = demoOrganizations.map((organization) => organization.slug);
    expect(slugs).toEqual(expect.arrayContaining([
      'unicef-palestine',
      'emirates-red-crescent',
      'fpya',
      'central-aid-system-gaza',
      'alsanabel-youth-development',
      'saudi-center-culture-heritage',
      'al-amal-orphans-institute',
      'gaza-gas-registration',
    ]));
    expect(slugs).not.toContain('noor-center-gaza');
    expect(slugs[0]).toBe('gaza-gas-registration');
    expect(demoOrganizations.filter((organization) => organization.slug !== 'wfp-palestine').every((organization) => !organization.support_url)).toBe(true);
  });

  it('uses the supplied Fajr Youth Society homepage without treating it as a registration form', () => {
    expect(demoOrganizations.find((organization) => organization.slug === 'fpya')).toMatchObject({
      official_website: 'https://home.fpya.ps/',
      verification_status: 'verified',
    });
    expect(demoOrganizations.find((organization) => organization.slug === 'fpya')?.registration_url).toBeUndefined();
  });

  it('lists the central Gaza aid system link without claiming official verification', () => {
    expect(demoOrganizations.find((organization) => organization.slug === 'central-aid-system-gaza')).toMatchObject({
      official_website: 'https://egaza.org/Home/Login',
      registration_url: 'https://egaza.org/Home/Login',
      verification_status: 'unverified',
    });
  });

  it('provides direct registration links for WFP, Kotof Al-Khair, and the central aid system', () => {
    expect(demoOrganizations.filter((organization) => organization.registration_url)).toMatchObject([
      { slug: 'gaza-gas-registration', registration_url: 'https://e-gaza.com/login' },
      { slug: 'wfp-palestine', registration_url: 'https://pal.beneficiaryregistration.cbt.wfp.org/form/consent' },
      { slug: 'kotof-al-khair', registration_url: 'https://aid.kotof.org/public/index.php/registration' },
      { slug: 'central-aid-system-gaza', registration_url: 'https://egaza.org/Home/Login' },
      { slug: 'alsanabel-youth-development', registration_url: 'https://aid.alsanabel.org/public/registration' },
      { slug: 'saudi-center-culture-heritage', registration_url: 'https://portal.ksah.org/beneficial-update' },
      { slug: 'al-amal-orphans-institute', registration_url: 'https://docs.google.com/forms/d/e/1FAIpQLSdD6X9dZhA7uXR9vitQtDlPsWQpFas-_-Ltw-QWmUqKdC2HZQ/viewform?pli=1' },
    ]);
  });

  it('includes Alsanabel official website and direct registration', () => {
    expect(demoOrganizations.find((organization) => organization.slug === 'alsanabel-youth-development')).toMatchObject({
      official_website: 'https://alsanabel.org/',
      registration_url: 'https://aid.alsanabel.org/public/registration',
      verification_status: 'verified',
    });
  });
});
