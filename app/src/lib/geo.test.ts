import { directionsUrl, distanceMeters } from './geo';

test('Tempelhof 1 km check', () => {
  const d = distanceMeters({ lat: 52.4731, lng: 13.4039 }, { lat: 52.4821, lng: 13.4039 });
  expect(d).toBeGreaterThan(990);
  expect(d).toBeLessThan(1010);
});

test('directionsUrl has destination', () => {
  expect(directionsUrl(52.4731, 13.4039)).toBe('https://www.google.com/maps/dir/?api=1&destination=52.4731,13.4039');
});
