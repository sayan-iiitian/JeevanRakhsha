import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

export function MapComponent() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simple map placeholder - in a real app, you would integrate with Leaflet.js or Google Maps
    if (mapRef.current) {
      // Simulate loading map
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div class="h-full bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center relative overflow-hidden">
              <div class="text-center text-gray-700">
                <div class="w-8 h-8 mx-auto mb-2 text-blue-600">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
                <p class="font-medium text-sm">Live Location</p>
                <p class="text-xs text-gray-500">Map view active</p>
              </div>
              <div class="absolute top-4 left-4 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
              <div class="absolute bottom-6 right-6 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full"></div>
            </div>
          `;
        }
      }, 500);
    }
  }, []);

  return (
    <div
      ref={mapRef}
      className="h-64 bg-gray-100 rounded-lg relative flex items-center justify-center"
    >
      <div className="text-center text-gray-500">
        <MapPin className="h-8 w-8 mx-auto mb-2" />
        <p className="text-sm">Loading map...</p>
      </div>
    </div>
  );
}
