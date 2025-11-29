import { useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
} from 'react-simple-maps';

interface Lane {
  origin: string;
  destination: string;
  count: number;
  revenue: number;
}

interface USMapProps {
  lanes: Lane[];
}

// State coordinates (longitude, latitude)
const STATE_COORDINATES: Record<string, { coords: [number, number]; name: string }> = {
  AL: { coords: [-86.9023, 32.3182], name: 'Alabama' },
  AK: { coords: [-152.4044, 61.3707], name: 'Alaska' },
  AZ: { coords: [-111.0937, 34.0489], name: 'Arizona' },
  AR: { coords: [-92.3731, 34.7465], name: 'Arkansas' },
  CA: { coords: [-119.4179, 36.7783], name: 'California' },
  CO: { coords: [-105.7821, 39.5501], name: 'Colorado' },
  CT: { coords: [-72.7554, 41.6032], name: 'Connecticut' },
  DE: { coords: [-75.5071, 38.9108], name: 'Delaware' },
  FL: { coords: [-81.5158, 27.6648], name: 'Florida' },
  GA: { coords: [-83.5007, 32.1574], name: 'Georgia' },
  HI: { coords: [-155.5828, 19.8968], name: 'Hawaii' },
  ID: { coords: [-114.7420, 44.0682], name: 'Idaho' },
  IL: { coords: [-89.3985, 40.6331], name: 'Illinois' },
  IN: { coords: [-86.1349, 40.2672], name: 'Indiana' },
  IA: { coords: [-93.0977, 41.8780], name: 'Iowa' },
  KS: { coords: [-98.4842, 39.0119], name: 'Kansas' },
  KY: { coords: [-84.2700, 37.8393], name: 'Kentucky' },
  LA: { coords: [-91.9623, 30.9843], name: 'Louisiana' },
  ME: { coords: [-69.4455, 45.2538], name: 'Maine' },
  MD: { coords: [-76.6413, 39.0458], name: 'Maryland' },
  MA: { coords: [-71.3824, 42.4072], name: 'Massachusetts' },
  MI: { coords: [-85.6024, 44.3148], name: 'Michigan' },
  MN: { coords: [-94.6859, 46.7296], name: 'Minnesota' },
  MS: { coords: [-89.3985, 32.3547], name: 'Mississippi' },
  MO: { coords: [-91.8318, 37.9643], name: 'Missouri' },
  MT: { coords: [-110.3626, 46.8797], name: 'Montana' },
  NE: { coords: [-99.9018, 41.4925], name: 'Nebraska' },
  NV: { coords: [-116.4194, 38.8026], name: 'Nevada' },
  NH: { coords: [-71.5724, 43.1939], name: 'New Hampshire' },
  NJ: { coords: [-74.4057, 40.0583], name: 'New Jersey' },
  NM: { coords: [-105.8701, 34.5199], name: 'New Mexico' },
  NY: { coords: [-75.5268, 43.2994], name: 'New York' },
  NC: { coords: [-79.0193, 35.7596], name: 'North Carolina' },
  ND: { coords: [-101.0020, 47.5515], name: 'North Dakota' },
  OH: { coords: [-82.9071, 40.4173], name: 'Ohio' },
  OK: { coords: [-97.5164, 35.4676], name: 'Oklahoma' },
  OR: { coords: [-120.5542, 43.8041], name: 'Oregon' },
  PA: { coords: [-77.1945, 41.2033], name: 'Pennsylvania' },
  RI: { coords: [-71.4774, 41.5801], name: 'Rhode Island' },
  SC: { coords: [-81.1637, 33.8361], name: 'South Carolina' },
  SD: { coords: [-99.9018, 43.9695], name: 'South Dakota' },
  TN: { coords: [-86.5804, 35.5175], name: 'Tennessee' },
  TX: { coords: [-99.9018, 31.9686], name: 'Texas' },
  UT: { coords: [-111.0937, 39.3200], name: 'Utah' },
  VT: { coords: [-72.5778, 44.5588], name: 'Vermont' },
  VA: { coords: [-78.6569, 37.4316], name: 'Virginia' },
  WA: { coords: [-120.7401, 47.7511], name: 'Washington' },
  WV: { coords: [-80.4549, 38.5976], name: 'West Virginia' },
  WI: { coords: [-89.6165, 43.7844], name: 'Wisconsin' },
  WY: { coords: [-107.2903, 43.0750], name: 'Wyoming' },
};

const geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

export function USMap({ lanes }: USMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [hoveredLane, setHoveredLane] = useState<Lane | null>(null);

  // Group lanes by state to show activity
  const stateActivity = new Map<string, { count: number; revenue: number }>();
  lanes.forEach((lane) => {
    [lane.origin, lane.destination].forEach((state) => {
      const current = stateActivity.get(state) || { count: 0, revenue: 0 };
      stateActivity.set(state, {
        count: current.count + lane.count,
        revenue: current.revenue + lane.revenue,
      });
    });
  });

  // Get max activity for normalization
  const maxActivity = Math.max(
    ...Array.from(stateActivity.values()).map((s) => s.count),
    1
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#0f172a', borderRadius: '8px' }}>
      <ComposableMap
        projection="geoAlbersUsa"
        style={{ width: '100%', height: '100%' }}
      >
        {/* US States */}
        <Geographies geography={geoUrl}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo: any) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="rgba(148, 163, 184, 0.1)"
                stroke="rgba(148, 163, 184, 0.3)"
                strokeWidth={0.5}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none', fill: 'rgba(59, 130, 246, 0.2)' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>

        {/* Lane connections */}
        {lanes.map((lane, idx) => {
          const origin = STATE_COORDINATES[lane.origin];
          const dest = STATE_COORDINATES[lane.destination];

          if (!origin || !dest) return null;

          const isHovered = hoveredLane === lane;
          const strokeWidth = isHovered ? 3 : Math.max(1, lane.count / 2);

          return (
            <Line
              key={idx}
              from={origin.coords}
              to={dest.coords}
              stroke="#f43f5e"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={isHovered ? 1 : 0.4}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredLane(lane)}
              onMouseLeave={() => setHoveredLane(null)}
            />
          );
        })}

        {/* State markers */}
        {Object.entries(STATE_COORDINATES).map(([code, data]) => {
          const activity = stateActivity.get(code);
          if (!activity || activity.count === 0) return null;

          const isHovered = hoveredState === code;
          const radius = 3 + (activity.count / maxActivity) * 5;

          return (
            <Marker
              key={code}
              coordinates={data.coords}
              onMouseEnter={() => setHoveredState(code)}
              onMouseLeave={() => setHoveredState(null)}
            >
              <circle
                r={radius}
                fill={isHovered ? '#f43f5e' : '#3b82f6'}
                opacity={0.8}
                style={{ cursor: 'pointer' }}
              />
              {isHovered && (
                <>
                  <circle
                    r={radius + 3}
                    fill="none"
                    stroke={isHovered ? '#f43f5e' : '#3b82f6'}
                    strokeWidth="1"
                    opacity={0.5}
                  />
                  <text
                    textAnchor="middle"
                    y={-radius - 8}
                    style={{
                      fill: 'white',
                      fontSize: '10px',
                      fontWeight: 600,
                      pointerEvents: 'none',
                    }}
                  >
                    {code}
                  </text>
                </>
              )}
            </Marker>
          );
        })}
      </ComposableMap>

      {/* Hover tooltip for lanes */}
      {hoveredLane && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: '#020617',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            minWidth: '200px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '8px',
              color: '#f43f5e',
            }}
          >
            {hoveredLane.origin} → {hoveredLane.destination}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7, display: 'grid', gap: '4px' }}>
            <div>
              <span>Calls: </span>
              <span style={{ fontWeight: 500 }}>{hoveredLane.count}</span>
            </div>
            <div>
              <span>Revenue: </span>
              <span style={{ fontWeight: 500 }}>
                $
                {hoveredLane.revenue.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hover tooltip for states */}
      {hoveredState && stateActivity.get(hoveredState) && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: '#020617',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            minWidth: '180px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '8px',
              color: '#3b82f6',
            }}
          >
            {STATE_COORDINATES[hoveredState].name} ({hoveredState})
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7, display: 'grid', gap: '4px' }}>
            <div>
              <span>Activity: </span>
              <span style={{ fontWeight: 500 }}>
                {stateActivity.get(hoveredState)!.count} calls
              </span>
            </div>
            <div>
              <span>Revenue: </span>
              <span style={{ fontWeight: 500 }}>
                $
                {stateActivity.get(hoveredState)!.revenue.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          backgroundColor: 'rgba(2, 6, 23, 0.8)',
          border: '1px solid rgba(148, 163, 184, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '11px',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '8px', opacity: 0.7 }}>LEGEND</div>
        <div style={{ display: 'grid', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                opacity: 0.8,
              }}
            />
            <span style={{ opacity: 0.7 }}>Origin/Destination</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '24px',
                height: '2px',
                backgroundColor: '#f43f5e',
                opacity: 0.6,
              }}
            />
            <span style={{ opacity: 0.7 }}>Shipping Lane</span>
          </div>
        </div>
      </div>
    </div>
  );
}
