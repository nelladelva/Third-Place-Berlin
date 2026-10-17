export type LatLng = { lat: number; lng: number };
export const BERLIN: LatLng = { lat: 52.52, lng: 13.405 };
export const CHECK_IN_RADIUS_M = 300;
export const NEAR_ME_M = 5000;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function currentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('unsupported'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(e),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}
