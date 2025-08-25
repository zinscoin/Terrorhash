"use client";
import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const COLORS: Record<string,string> = {
  CRITICAL: "#8B0000",
  HIGH: "#E53935",
  ELEVATED: "#FB8C00",
  MODERATE: "#FDD835",
  LOW: "#7CB342",
  MINIMAL: "#2E7D32"
};

export default function TerrorMap({ fromISO, presetKey }:{ fromISO:string; presetKey:string }){
  const container = useRef<HTMLDivElement|null>(null);
  const mapRef = useRef<mapboxgl.Map|null>(null);
  const [panel, setPanel] = useState<any|null>(null);

  const untilISO = useMemo(()=> new Date().toISOString(), [fromISO]);

  const buildColorExpression = (risk: any[]) => {
    const exp: any[] = ["match", ["get","iso_3166_1"], "MINIMAL", COLORS.MINIMAL];
    risk.forEach((r:any)=>{ exp.push(r.isoA2, COLORS[r.category] || COLORS.MINIMAL); });
    exp.push(COLORS.MINIMAL);
    return exp;
  };

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [12,20], zoom: 1.4
    });
    mapRef.current = map;

    map.on("load", async () => {
      map.addSource("country-bounds", {
        type: "vector",
        url: "mapbox://mapbox.country-boundaries-v1"
      });

      const risk = await fetch(`/api/country_risk?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(untilISO)}`).then(r=>r.json());

      map.addLayer({
        id: "country-fill",
        type: "fill",
        source: "country-bounds",
        "source-layer": "country_boundaries",
        paint: {
          "fill-color": buildColorExpression(risk.items),
          "fill-opacity": 0.72
        }
      });

      map.addLayer({
        id: "country-outline",
        type: "line",
        source: "country-bounds",
        "source-layer": "country_boundaries",
        paint: { "line-color": "#475569", "line-width": 0.5, "line-opacity": 0.6 }
      });

      map.addSource("events", {
        type: "geojson",
        data: `/api/events?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(untilISO)}`,
        cluster: true, clusterRadius: 40, clusterMaxZoom: 6
      });

      map.addLayer({ id:"clusters", type:"circle", source:"events", filter:["has","point_count"], paint:{
        "circle-radius": ["step", ["get","point_count"], 12, 10, 16, 50, 22, 200, 28],
        "circle-color": ["step", ["get","point_count"], "#7CB342", 10, "#FB8C00", 50, "#E53935", 200, "#8B0000"],
        "circle-opacity": 0.85
      }});

      map.addLayer({ id:"cluster-count", type:"symbol", source:"events", filter:["has","point_count"], layout:{
        "text-field":["get","point_count_abbreviated"], "text-size":12, "text-font":["Open Sans Bold","Arial Unicode MS Bold"]
      }});

      map.addLayer({ id:"event-unclustered", type:"circle", source:"events", filter:["!",["has","point_count"]], paint:{
        "circle-radius":6, "circle-color":"#1f78b4", "circle-stroke-width":1.2, "circle-stroke-color":"#fff"
      }});

      map.on("click","country-fill", (e:any)=>{
        const iso = e.features[0].properties.iso_3166_1 as string;
        const meta = risk.items.find((x:any)=>x.isoA2===iso) || { category:"MINIMAL", score:0, name:e.features[0].properties.name_en};
        setPanel({ iso, ...meta });
      });

      map.on("click","event-unclustered", (e:any)=>{
        const p = e.features[0].properties;
        const html = `<div style='font:13px system-ui'><div style='font-weight:600'>${p.title||"Incident"}</div>
          <div>${p.datetime||""}</div><div>${p.location||""}</div>
          <div style='margin-top:4px'>Fatalities: <b>${p.fatalities??"–"}</b> · Injuries: <b>${p.injuries??"–"}</b></div>
          ${p.source?`<div style='margin-top:6px'><a href='${p.source}' target='_blank' rel='noopener'>Source</a></div>`:""}</div>`;
        new mapboxgl.Popup().setLngLat(e.lngLat).setHTML(html).addTo(map);
      });
    });

    return () => { map.remove(); };
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    (async () => {
      const risk = await fetch(`/api/country_risk?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(untilISO)}`).then(r=>r.json());
      if (map.getLayer("country-fill")) {
        map.setPaintProperty("country-fill","fill-color", buildColorExpression(risk.items));
      }
      const evSrc = map.getSource("events") as mapboxgl.GeoJSONSource;
      if (evSrc) evSrc.setData(`/api/events?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(untilISO)}`);
    })();
  }, [fromISO, untilISO, presetKey]);

  return (
    <>
      <div id="map" ref={container} />
      <div className="legend">
        <div style={{fontWeight:600,marginBottom:6}}>Risk Level (window)</div>
        {Object.entries(COLORS).map(([k,c])=> (
          <div className="row" key={k}><span className="sw" style={{background:c}}></span>{k}</div>
        ))}
      </div>
      {panel && (
        <aside className="panel">
          <h3>{panel.name || panel.iso}</h3>
          <div><b>{panel.category}</b> – Score {panel.score?.toFixed?.(1) ?? "0.0"}</div>
          {panel.gti !== undefined && (<div style={{marginTop:6}}><small>GTI benchmark: {panel.gti.toFixed(1)} (0–10)</small></div>)}
          <div style={{marginTop:10}}><a href={`/country/${panel.iso}`} style={{color:'#2563eb'}}>Show trend</a></div>
        </aside>
      )}
    </>
  );
}
