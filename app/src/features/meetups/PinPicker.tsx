import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { BERLIN, type LatLng } from '../../lib/geo';

export const pinIcon = L.divIcon({ className: 'pin-icon', html: '📍', iconSize: [34, 34] });

function ClickToPlace({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FollowPin({ pin }: { pin: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (pin) map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), 15));
  }, [pin?.lat, pin?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** OpenStreetMap with one pin. Tap the map to (re)place it when `onPick` is given. */
export function PinMap({ pin, sign, onPick, height = 240 }: { pin: LatLng | null; sign?: string | null; onPick?: (p: LatLng) => void; height?: number }) {
  const center = pin ?? BERLIN;
  return (
    <div className="map" style={{ height }}>
      <MapContainer center={[center.lat, center.lng]} zoom={pin ? 15 : 12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" maxZoom={19} />
        {pin && (
          <Marker position={[pin.lat, pin.lng]} icon={pinIcon}>
            {sign && <Tooltip permanent direction="right" offset={[12, -16]} className="sign-tip">{sign}</Tooltip>}
          </Marker>
        )}
        {onPick && <ClickToPlace onPick={onPick} />}
        <FollowPin pin={pin} />
      </MapContainer>
    </div>
  );
}
