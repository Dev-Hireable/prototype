type GsapModule = typeof import('gsap');

let gsapPromise: Promise<GsapModule> | null = null;

export function loadGsap(): Promise<GsapModule> {
  if (!gsapPromise) {
    gsapPromise = import('gsap');
  }

  return gsapPromise;
}

export function reportGsapLoadError(error: unknown) {
  console.warn('Failed to load GSAP animation module', error);
}
